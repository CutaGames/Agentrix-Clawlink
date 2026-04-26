import { WearableVendorRegistryService } from './wearableVendorRegistry.service';
const STANDARD_SERVICE_LABELS = {
    '1800': 'Generic Access',
    '1801': 'Generic Attribute',
    '1809': 'Health Thermometer',
    '180a': 'Device Information',
    '180d': 'Heart Rate',
    '180f': 'Battery',
    '1810': 'Blood Pressure',
    '181a': 'Environmental Sensing',
};
export class WearableDeviceAdapterService {
    static buildScanCandidate(device) {
        const kind = this.inferKind(device.name);
        const serviceLabels = this.getServiceLabels(device.serviceUUIDs);
        const supportTier = this.inferSupportTier(serviceLabels, 0);
        const signalLabel = typeof device.rssi === 'number' ? `${device.rssi} dBm` : 'RSSI unknown';
        return WearableVendorRegistryService.enrichScanCandidate({
            id: device.id,
            name: device.name,
            kind,
            supportTier,
            summary: this.buildScanSummary(kind, serviceLabels, signalLabel),
            serviceLabels,
            signalLabel,
            raw: device,
        });
    }
    static adaptConnectionSnapshot(snapshot) {
        const serviceLabels = this.getServiceLabels(snapshot.services.map((service) => service.uuid));
        const kind = this.inferKind(snapshot.device.name);
        const supportTier = this.inferSupportTier(serviceLabels, snapshot.readableCharacteristics.length);
        return WearableVendorRegistryService.enrichProfile({
            id: snapshot.device.id,
            name: snapshot.device.name,
            kind,
            supportTier,
            summary: this.buildConnectionSummary(snapshot.services.length, snapshot.readableCharacteristics.length, serviceLabels),
            serviceLabels,
            servicesCount: snapshot.services.length,
            readableCount: snapshot.readableCharacteristics.length,
            notifiableCount: snapshot.notifiableCharacteristics.length,
            firstReadCharacteristicUuid: snapshot.firstReadCharacteristic?.uuid ?? null,
            firstReadPayload: snapshot.firstReadCharacteristic?.value ?? null,
            readError: snapshot.readError,
            connectedAt: snapshot.connectedAt,
        });
    }
    static getServiceLabels(serviceUUIDs) {
        const labels = serviceUUIDs.map((serviceUuid) => STANDARD_SERVICE_LABELS[this.toShortUuid(serviceUuid)] || this.toShortUuid(serviceUuid));
        return Array.from(new Set(labels));
    }
    static inferKind(deviceName) {
        const normalizedName = deviceName.toLowerCase();
        if (normalizedName.includes('ring')) {
            return 'ring';
        }
        if (normalizedName.includes('band') || normalizedName.includes('bracelet') || normalizedName.includes('watch')) {
            return 'band';
        }
        if (normalizedName.includes('clip') || normalizedName.includes('tag')) {
            return 'clip';
        }
        if (normalizedName.includes('sensor') || normalizedName.includes('heart') || normalizedName.includes('thermo')) {
            return 'sensor';
        }
        return 'unknown';
    }
    static inferSupportTier(serviceLabels, readableCount) {
        if (readableCount > 0 || serviceLabels.includes('Heart Rate') || serviceLabels.includes('Battery')) {
            return 'ready';
        }
        if (serviceLabels.length > 0) {
            return 'known';
        }
        return 'beta';
    }
    static buildScanSummary(kind, serviceLabels, signalLabel) {
        const serviceSummary = serviceLabels.length > 0
            ? `Advertises ${serviceLabels.slice(0, 3).join(', ')}.`
            : 'No advertised standard services detected yet.';
        return `${this.kindLabel(kind)} candidate. ${serviceSummary} ${signalLabel}.`;
    }
    static buildConnectionSummary(servicesCount, readableCount, serviceLabels) {
        const serviceSummary = serviceLabels.length > 0 ? serviceLabels.join(', ') : 'vendor-specific services only';
        return `Discovered ${servicesCount} GATT services, ${readableCount} readable characteristics, and identified ${serviceSummary}.`;
    }
    static kindLabel(kind) {
        switch (kind) {
            case 'ring':
                return 'Ring';
            case 'band':
                return 'Band';
            case 'clip':
                return 'Clip';
            case 'sensor':
                return 'Sensor';
            default:
                return 'Wearable';
        }
    }
    static toShortUuid(uuid) {
        const normalizedUuid = uuid.toLowerCase();
        const standardMatch = normalizedUuid.match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/);
        return standardMatch?.[1] ?? normalizedUuid;
    }
}
