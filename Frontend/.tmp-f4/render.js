"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSection = renderSection;
const react_1 = __importDefault(require("react"));
const registry_1 = require("./registry");
function renderSection(raw) {
    if (!raw || typeof raw !== "object") {
        console.warn("renderSection: expected an object, received a non-object value.");
        return null;
    }
    const section = raw;
    if (typeof section.type !== "string") {
        console.warn("renderSection: section missing a valid string type.", raw);
        return null;
    }
    const validator = registry_1.sectionSchemas[section.type];
    if (!validator) {
        console.warn(`renderSection: unknown section type "${section.type}".`);
        return null;
    }
    const parsed = validator.safeParse(section.config);
    if (!parsed.success) {
        console.warn(`renderSection: invalid config for section type "${section.type}".`, parsed.error.flatten());
        return null;
    }
    const Component = registry_1.SECTION_COMPONENTS[section.type];
    if (!Component) {
        console.warn(`renderSection: no component registered for section type "${section.type}".`);
        return null;
    }
    return react_1.default.createElement(Component, {
        key: section.id ?? section.type,
        config: parsed.data,
    });
}
