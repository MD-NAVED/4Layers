import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import our backend components
# Set environment variables for testing before importing main
TEST_DB_FILE = "./test_smartnest.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE}"
# Disable real MQTT connections during unit testing to avoid network dependencies
os.environ["MQTT_BROKER"] = "localhost"  # dummy host

from backend.main import app
from backend.database import Base, get_db
from backend import models

# Configure test database engine and session
engine = create_engine(f"sqlite:///{TEST_DB_FILE}", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Apply dependency override
app.dependency_overrides[get_db] = override_get_db

class TestSmartNestBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Create database tables
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # Drop database tables and remove test DB file
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
        
        # Also dispose main backend engine to release any connections it holds
        try:
            from backend.database import engine as main_engine
            main_engine.dispose()
        except Exception:
            pass
            
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception as e:
                print(f"Warning: Could not remove test DB file: {e}")

    def test_full_workflow(self):
        # 1. Register a new user
        register_payload = {
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "securepassword123"
        }
        response = self.client.post("/api/users/register", json=register_payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["username"], "testuser")
        self.assertEqual(data["email"], "testuser@example.com")
        self.assertIn("id", data)
        user_id = data["id"]

        # 2. Try registering duplicate username
        response_dup = self.client.post("/api/users/register", json=register_payload)
        self.assertEqual(response_dup.status_code, 400)

        # 3. Login to retrieve access token
        login_payload = {
            "username": "testuser",
            "password": "securepassword123"
        }
        response = self.client.post("/api/users/login", data=login_payload)
        self.assertEqual(response.status_code, 200)
        token_data = response.json()
        self.assertIn("access_token", token_data)
        self.assertEqual(token_data["token_type"], "bearer")
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 4. Fetch currently authenticated user
        response = self.client.get("/api/users/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["username"], "testuser")

        # 5. Provision a new device board with room assignment & name prefix
        provision_payload = {
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "type": "LIGHT",
            "name": "Bedside Panel",
            "new_room_name": "Master Bedroom",
            "new_room_type": "bedroom"
        }
        response = self.client.post("/api/devices/provision", json=provision_payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        provision_res = response.json()
        self.assertIn("id", provision_res)
        
        # 6. List devices and verify 7 channels are created with correct names and room
        response = self.client.get("/api/devices", headers=headers)
        self.assertEqual(response.status_code, 200)
        devices_list = response.json()
        self.assertEqual(len(devices_list), 7)
        
        # Verify names are prefixed and room is linked
        for dev in devices_list:
            self.assertTrue(dev["name"].startswith("Bedside Panel"))
            self.assertIsNotNone(dev["room_id"])
            
        # Get active room ID
        room_id = devices_list[0]["room_id"]

        # 7. Re-provision the device to a different room and update prefix
        reprovision_payload = {
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "type": "LIGHT",
            "name": "Main Board",
            "new_room_name": "Living Room",
            "new_room_type": "living_room"
        }
        response = self.client.post("/api/devices/provision", json=reprovision_payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        
        # 8. List devices and verify room and names are updated
        response = self.client.get("/api/devices", headers=headers)
        self.assertEqual(response.status_code, 200)
        updated_devices = response.json()
        self.assertEqual(len(updated_devices), 7)
        
        for dev in updated_devices:
            self.assertTrue(dev["name"].startswith("Main Board"))
            self.assertNotEqual(dev["room_id"], room_id)
            
        # 9. Clean up (remove one of the devices)
        device_id = updated_devices[0]["id"]
        response = self.client.delete(f"/api/devices/{device_id}", headers=headers)
        self.assertEqual(response.status_code, 200)

if __name__ == "__main__":
    unittest.main()
