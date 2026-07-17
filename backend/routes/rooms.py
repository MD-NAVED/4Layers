from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from backend.database import get_db
from backend import models, auth, schemas

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

@router.post("", response_model=schemas.RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    room_data: schemas.RoomCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new room in a home. Verifies home ownership."""
    home = db.query(models.Home).filter(
        models.Home.id == room_data.home_id,
        models.Home.owner_id == current_user.id
    ).first()
    
    if not home:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found or access denied"
        )
        
    new_room = models.Room(
        name=room_data.name,
        room_type=room_data.room_type,
        home_id=room_data.home_id
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@router.get("/home/{home_id}", response_model=List[schemas.RoomResponse])
def get_rooms(
    home_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all rooms inside a specific home. Verifies home ownership."""
    home = db.query(models.Home).filter(
        models.Home.id == home_id,
        models.Home.owner_id == current_user.id
    ).first()
    
    if not home:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found or access denied"
        )
        
    rooms = db.query(models.Room).filter(models.Room.home_id == home_id).all()
    if not rooms:
        default_rooms = [
            {"name": "Living Room", "type": "living_room"},
            {"name": "Bedroom", "type": "bedroom"},
            {"name": "Kitchen", "type": "kitchen"},
            {"name": "Balcony", "type": "living_room"},
            {"name": "Gaming Room", "type": "living_room"}
        ]
        for r in default_rooms:
            room = models.Room(
                name=r["name"],
                room_type=r["type"],
                home_id=home_id
            )
            db.add(room)
        db.commit()
        rooms = db.query(models.Room).filter(models.Room.home_id == home_id).all()
        
    return rooms

@router.delete("/{room_id}", status_code=status.HTTP_200_OK)
def delete_room(
    room_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a room by UUID. Devices in this room will have room_id set to null."""
    room = db.query(models.Room).join(models.Home).filter(
        models.Room.id == room_id,
        models.Home.owner_id == current_user.id
    ).first()
    
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found or access denied"
        )
        
    # Cascade delete all devices in this room
    db.query(models.Device).filter(models.Device.room_id == room_id).delete(synchronize_session=False)
    db.delete(room)
    db.commit()
    return {"detail": "Room and all its devices successfully deleted."}
