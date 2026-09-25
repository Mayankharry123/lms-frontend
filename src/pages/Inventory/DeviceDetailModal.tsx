import React from 'react';
import ModalPopup from '../../components/ui/ModalPopup';
import type { DeviceData } from '../../types/inventory.types';
import {
  collectDeviceMediaImages,
  DEVICE_DETAIL_SECTIONS,
  formatDeviceFieldLabel,
  getDeviceFieldValue,
} from './deviceInventoryConfig.ts';

type DeviceDetailModalProps = {
  device: DeviceData | null;
  loading?: boolean;
  onClose: () => void;
};

const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  device,
  loading = false,
  onClose,
}) => {
  if (!device && !loading) return null;

  const title = loading
    ? 'Loading screen details'
    : device?.device_name?.trim() ||
      device?.screen_id?.trim() ||
      `Screen #${device?.device_id || device?.device_details_id}`;
  const mediaImages = device ? collectDeviceMediaImages(device) : [];

  return (
    <ModalPopup
      show={Boolean(device) || loading}
      onClose={onClose}
      title={title}
      panelClassName="max-w-4xl"
      bodyClassName="max-h-[75vh] overflow-y-auto"
      overlayClassName="z-[4000]"
      frameClassName="z-[4001]"
    >
      {loading || !device ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          Loading screen details…
        </div>
      ) : (
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <span className="font-medium text-gray-900">Device ID:</span> {device.device_id || '-'}
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-medium text-gray-900">Screen ID:</span> {device.screen_id || '-'}
          <span className="mx-2 text-gray-300">|</span>
          <span className="font-medium text-gray-900">City:</span> {device.city || '-'}
        </div>

        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Related Media Images
          </h3>
          {mediaImages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              No media images available for this screen.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediaImages.map((image) => (
                <div
                  key={image.key}
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <div className="border-b border-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
                    {image.label}
                  </div>
                  <a href={image.url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={image.url}
                      alt={image.label}
                      className="h-44 w-full object-cover"
                    />
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {DEVICE_DETAIL_SECTIONS.map((section) => {
          const rows = section.fields
            .map((field) => ({
              field,
              label: formatDeviceFieldLabel(field),
              value: getDeviceFieldValue(device, field),
            }))
            .filter((row) => row.value !== '-');

          if (rows.length === 0) return null;

          return (
            <section key={section.title}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rows.map((row) => (
                  <div
                    key={row.field}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5"
                  >
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      {row.label}
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 break-words">{row.value}</dd>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      )}
    </ModalPopup>
  );
};

export default DeviceDetailModal;
