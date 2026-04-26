import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
const DEFAULT_SCAN_DURATION_MS = 10000;
export class WearableBleGatewayService {
    static async requestPermissions() {
        if (Platform.OS !== 'android') {
            return {
                bluetooth: true,
                location: true,
                nearbyDevices: true,
                granted: true,
            };
        }
        const requestedPermissions = Platform.Version >= 31
            ? [
                'android.permission.BLUETOOTH_SCAN',
                'android.permission.BLUETOOTH_CONNECT',
                'android.permission.ACCESS_FINE_LOCATION',
            ]
            : ['android.permission.ACCESS_FINE_LOCATION'];
        const result = await PermissionsAndroid.requestMultiple(requestedPermissions);
        const isGranted = (permission) => result[permission] === PermissionsAndroid.RESULTS.GRANTED;
        const bluetooth = Platform.Version >= 31
            ? isGranted('android.permission.BLUETOOTH_SCAN') && isGranted('android.permission.BLUETOOTH_CONNECT')
            : true;
        const location = isGranted('android.permission.ACCESS_FINE_LOCATION');
        const nearbyDevices = bluetooth;
        return {
            bluetooth,
            location,
            nearbyDevices,
            granted: bluetooth && location && nearbyDevices,
        };
    }
    static async ensurePoweredOn(timeoutMs = 12000) {
        const currentState = await this.manager.state();
        if (currentState === 'PoweredOn') {
            return;
        }
        if (currentState === 'Unsupported') {
            throw new Error('Bluetooth LE is not supported on this device.');
        }
        if (currentState === 'Unauthorized') {
            throw new Error('Bluetooth permission is not authorized.');
        }
        await new Promise((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                subscription.remove();
                reject(new Error('Bluetooth is off or unavailable. Please enable Bluetooth and try again.'));
            }, timeoutMs);
            const subscription = this.manager.onStateChange((state) => {
                if (settled) {
                    return;
                }
                if (state === 'PoweredOn') {
                    settled = true;
                    clearTimeout(timer);
                    subscription.remove();
                    resolve();
                    return;
                }
                if (state === 'Unsupported' || state === 'Unauthorized') {
                    settled = true;
                    clearTimeout(timer);
                    subscription.remove();
                    reject(new Error(state === 'Unsupported' ? 'Bluetooth LE is not supported on this device.' : 'Bluetooth permission is not authorized.'));
                }
            }, true);
        });
    }
    static async startScan(params) {
        await this.ensurePoweredOn();
        this.manager.stopDeviceScan();
        const seenDevices = new Map();
        let finished = false;
        const finish = () => {
            if (finished) {
                return;
            }
            finished = true;
            clearTimeout(scanTimer);
            this.manager.stopDeviceScan();
            params.onFinished?.(Array.from(seenDevices.values()).sort((left, right) => (right.rssi ?? -999) - (left.rssi ?? -999)));
        };
        const scanTimer = setTimeout(finish, params.durationMs ?? DEFAULT_SCAN_DURATION_MS);
        this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
            if (error) {
                params.onError?.(new Error(error.message || 'BLE scan failed.'));
                finish();
                return;
            }
            const normalizedDevice = this.normalizeDevice(device);
            seenDevices.set(normalizedDevice.id, normalizedDevice);
            params.onDevice(normalizedDevice);
        });
        return finish;
    }
    static async connectAndInspect(device, onStageChange) {
        onStageChange?.('connecting');
        const connectedDevice = await this.manager.connectToDevice(device.id);
        onStageChange?.('discovering');
        const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
        const services = await discoveredDevice.services();
        const serviceSnapshots = [];
        const readableCharacteristics = [];
        const notifiableCharacteristics = [];
        for (const service of services) {
            const characteristics = await discoveredDevice.characteristicsForService(service.uuid);
            const characteristicSnapshots = characteristics.map((characteristic) => this.toCharacteristicSnapshot(characteristic, service.uuid));
            readableCharacteristics.push(...characteristicSnapshots.filter((characteristic) => characteristic.isReadable));
            notifiableCharacteristics.push(...characteristicSnapshots.filter((characteristic) => characteristic.isNotifiable));
            serviceSnapshots.push({
                uuid: service.uuid.toLowerCase(),
                characteristics: characteristicSnapshots,
            });
        }
        let firstReadCharacteristic = null;
        let readError = null;
        const firstReadableCharacteristic = readableCharacteristics[0] ?? null;
        if (firstReadableCharacteristic) {
            onStageChange?.('reading');
            try {
                const characteristic = await discoveredDevice.readCharacteristicForService(firstReadableCharacteristic.serviceUuid, firstReadableCharacteristic.uuid);
                firstReadCharacteristic = this.toCharacteristicSnapshot(characteristic, firstReadableCharacteristic.serviceUuid);
            }
            catch (error) {
                readError = error?.message || 'Characteristic read failed.';
                firstReadCharacteristic = firstReadableCharacteristic;
            }
        }
        onStageChange?.('done');
        return {
            device: this.normalizeDevice(discoveredDevice),
            services: serviceSnapshots,
            readableCharacteristics,
            notifiableCharacteristics,
            firstReadCharacteristic,
            readError,
            connectedAt: new Date().toISOString(),
        };
    }
    static monitorCharacteristic(deviceId, serviceUuid, characteristicUuid, onEvent, onError) {
        const subscription = this.manager.monitorCharacteristicForDevice(deviceId, serviceUuid, characteristicUuid, (error, characteristic) => {
            if (error) {
                onError?.(new Error(error.message || 'Characteristic monitor failed.'));
                return;
            }
            if (!characteristic) {
                return;
            }
            onEvent({
                id: `${deviceId}:${characteristicUuid}:${Date.now()}`,
                deviceId,
                serviceUuid: serviceUuid.toLowerCase(),
                characteristicUuid: characteristicUuid.toLowerCase(),
                value: characteristic.value ?? null,
                receivedAt: new Date().toISOString(),
            });
        });
        return () => {
            subscription.remove();
        };
    }
    static async disconnectDevice(deviceId) {
        try {
            const isConnected = await this.manager.isDeviceConnected(deviceId);
            if (isConnected) {
                await this.manager.cancelDeviceConnection(deviceId);
            }
        }
        catch {
            // Ignore disconnect cleanup errors.
        }
    }
    static normalizeDevice(device) {
        return {
            id: device.id,
            name: device.name || device.localName || `BLE-${device.id.slice(-4)}`,
            localName: device.localName ?? null,
            rssi: typeof device.rssi === 'number' ? device.rssi : null,
            manufacturerData: device.manufacturerData ?? null,
            serviceUUIDs: (device.serviceUUIDs ?? []).map((uuid) => uuid.toLowerCase()),
        };
    }
    static toCharacteristicSnapshot(characteristic, serviceUuid) {
        return {
            uuid: characteristic.uuid.toLowerCase(),
            serviceUuid: serviceUuid.toLowerCase(),
            isReadable: characteristic.isReadable,
            isWritableWithResponse: characteristic.isWritableWithResponse,
            isWritableWithoutResponse: characteristic.isWritableWithoutResponse,
            isNotifiable: characteristic.isNotifiable,
            value: characteristic.value ?? null,
        };
    }
}
WearableBleGatewayService.manager = new BleManager();
