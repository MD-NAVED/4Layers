import Paho from 'paho-mqtt';

const MQTT_HOST = 'i26a1c71.ala.asia-southeast1.emqxsl.com';
const MQTT_PORT = 8084;
const MQTT_PATH = '/mqtt';
const MQTT_USER = 'smartnest_client';
const MQTT_PASS = 'D2m9ga8JynJDEM6';

let pahoClient = null;
let isConnected = false;
let connectingPromise = null;
let listeners = new Set();

export const getMqttClient = () => {
  if (pahoClient) return pahoClient;

  const clientId = `SmartNest-App-${Math.random().toString(16).substr(2, 8)}`;
  pahoClient = new Paho.Client(MQTT_HOST, MQTT_PORT, MQTT_PATH, clientId);

  pahoClient.onConnectionLost = (responseObject) => {
    isConnected = false;
    connectingPromise = null;
    console.log('[MQTT Client] Connection lost:', responseObject?.errorMessage || 'Unknown');
    // Auto-reconnect in 5 seconds
    setTimeout(() => {
      connectMqtt().catch(err => console.log('[MQTT Client] Reconnect failed:', err));
    }, 5000);
  };

  pahoClient.onMessageArrived = (message) => {
    console.log('[MQTT Client] Message arrived:', message.destinationName, message.payloadString);
    listeners.forEach(cb => {
      try {
        cb(message.destinationName, message.payloadString);
      } catch (e) {
        console.error('[MQTT Client] Callback error:', e);
      }
    });
  };

  return pahoClient;
};

export const connectMqtt = () => {
  if (isConnected) return Promise.resolve(pahoClient);
  if (connectingPromise) return connectingPromise;

  const client = getMqttClient();
  connectingPromise = new Promise((resolve, reject) => {
    client.connect({
      useSSL: true,
      userName: MQTT_USER,
      password: MQTT_PASS,
      onSuccess: () => {
        isConnected = true;
        connectingPromise = null;
        console.log('[MQTT Client] Connected successfully over secure WebSockets!');
        resolve(client);
      },
      onFailure: (err) => {
        connectingPromise = null;
        console.error('[MQTT Client] Connection failed:', err);
        reject(err);
      }
    });
  });

  return connectingPromise;
};

export const disconnectMqtt = () => {
  if (pahoClient && isConnected) {
    try {
      pahoClient.disconnect();
      console.log('[MQTT Client] Disconnected.');
    } catch (e) {
      console.warn('[MQTT Client] Disconnect error:', e);
    }
    isConnected = false;
    connectingPromise = null;
  }
};

export const publishMessage = (topic, payload) => {
  if (!pahoClient || !isConnected) {
    console.warn('[MQTT Client] Cannot publish. Not connected.');
    return false;
  }
  try {
    const message = new Paho.Message(JSON.stringify(payload));
    message.destinationName = topic;
    message.qos = 1;
    pahoClient.send(message);
    console.log('[MQTT Client] Published to', topic, payload);
    return true;
  } catch (e) {
    console.error('[MQTT Client] Publish failed:', e);
    return false;
  }
};

export const registerMqttListener = (callback) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

export const isMqttConnected = () => isConnected;
