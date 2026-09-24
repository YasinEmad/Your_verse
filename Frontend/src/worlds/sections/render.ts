import React from "react";
import { SECTION_COMPONENTS, sectionSchemas, type SectionType } from "./registry";

type SectionLike = {
  type?: unknown;
  config?: unknown;
  id?: string;
};

export function renderSection(raw: unknown): React.ReactNode {
  if (!raw || typeof raw !== "object") {
    console.warn("renderSection: expected an object, received a non-object value.");
    return null;
  }

  const section = raw as SectionLike;

  if (typeof section.type !== "string") {
    console.warn("renderSection: section missing a valid string type.", raw);
    return null;
  }

  const validator = sectionSchemas[section.type as SectionType];
  if (!validator) {
    console.warn(`renderSection: unknown section type "${section.type}".`);
    return null;
  }

  const parsed = validator.safeParse(section.config);
  if (!parsed.success) {
    console.warn(
      `renderSection: invalid config for section type "${section.type}".`,
      parsed.error.flatten(),
    );
    return null;
  }

  const Component = SECTION_COMPONENTS[section.type as SectionType] as React.ComponentType<{
    config: unknown;
  }>;
  if (!Component) {
    console.warn(`renderSection: no component registered for section type "${section.type}".`);
    return null;
  }

  return React.createElement(Component, {
    key: section.id ?? section.type,
    config: parsed.data,
  });
}
