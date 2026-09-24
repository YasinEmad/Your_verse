"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CharacterShowcase = CharacterShowcase;
const jsx_runtime_1 = require("react/jsx-runtime");
function CharacterShowcase({ config }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-semibold text-slate-900", children: "Character showcase" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 flex flex-wrap gap-3", children: config.characterIds.map((id) => ((0, jsx_runtime_1.jsx)("span", { className: "rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700", children: id }, id))) })] }));
}
