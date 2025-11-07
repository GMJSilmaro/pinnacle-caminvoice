"use client";

import React from "react";
import { Tabs } from "@mantine/core";
import classes from "./Demo.module.css";

export type SegmentedTabItem = {
  value: string;
  label: React.ReactNode;
  leftSection?: React.ReactNode;
};

export type SegmentedTabsProps = {
  items: SegmentedTabItem[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string | null) => void;
  grow?: boolean;
  listProps?: React.ComponentProps<typeof Tabs.List>;
  tabsProps?: Partial<React.ComponentProps<typeof Tabs>>;
};

export default function SegmentedTabs({
  items,
  defaultValue,
  value,
  onChange,
  grow = true,
  listProps,
  tabsProps,
}: SegmentedTabsProps) {
  return (
    <Tabs
      variant="unstyled"
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      // Mantine will pick known keys from classNames object (e.g., tab)
      classNames={{ tab: classes.tab }}
      {...tabsProps}
    >
      <Tabs.List grow={grow} {...listProps}>
        {items.map((item) => (
          <Tabs.Tab key={item.value} value={item.value} leftSection={item.leftSection}>
            {item.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}

