"use client";

import { CurrentDeviceIcon } from "@/components/icons";
import { useDevMode } from "@/hooks/use-dev-mode";
import { useMounted } from "@/hooks/use-mounted";
import { formatRecentDay } from "@/lib/dates";
import { FragmentType } from "@apollo/client";
import { useFragment } from "@apollo/client/react";
import { Table } from "@heroui/react";
import {
  DeviceTableFragment,
  DeviceTableFragmentDoc,
} from "./__generated__/deviceTable.generated";
import { DeviceName } from "./device-name";

type DeviceTableProps = {
  user: FragmentType<DeviceTableFragment>;
  /** The key of the device I'm being shown on. */
  currentKey: string;
};

const THIS_DEVICE = "This device";
const KEY_ONLY_ON_LARGE_SCREENS = "hidden lg:table-cell";

/**
 * I list a user's devices, in the order given, marking the one I'm shown
 * on, and let each be renamed. In dev mode, large screens also show each
 * device's key.
 */
export function DeviceTable({ user, currentKey }: DeviceTableProps) {
  const { data, complete } = useFragment({
    fragment: DeviceTableFragmentDoc,
    from: user,
  });
  const devMode = useDevMode();
  const mounted = useMounted();
  const devices = complete ? data.devices : [];

  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Devices">
          <Table.Header>
            <Table.Column>
              <span className="sr-only">{THIS_DEVICE}</span>
            </Table.Column>
            <Table.Column isRowHeader>Device</Table.Column>
            <Table.Column>Last Used</Table.Column>
            {devMode && (
              <Table.Column className={KEY_ONLY_ON_LARGE_SCREENS}>
                Key
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body>
            {devices.map((device) => (
              <Table.Row key={device.id} id={device.id}>
                <Table.Cell>
                  {device.key === currentKey && (
                    <span title={THIS_DEVICE} className="flex text-accent">
                      <CurrentDeviceIcon
                        size="small"
                        role="img"
                        aria-label={THIS_DEVICE}
                      />
                    </span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <DeviceName id={device.id} name={device.name} />
                </Table.Cell>
                <Table.Cell>
                  {mounted && formatRecentDay(device.lastEnsuredAt)}
                </Table.Cell>
                {devMode && (
                  <Table.Cell className={KEY_ONLY_ON_LARGE_SCREENS}>
                    {device.key}
                  </Table.Cell>
                )}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
