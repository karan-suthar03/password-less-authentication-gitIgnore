const devices = new Map();

/*
device = {
  deviceId,
  userId,
  createdAt,
  lastSeen
}
*/

export default {
  create(device) {
    devices.set(device.deviceId, device);
  },

  get(deviceId) {
    return devices.get(deviceId);
  }
};