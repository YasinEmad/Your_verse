"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChessBoard = ChessBoard;
const jsx_runtime_1 = require("react/jsx-runtime");
function ChessBoard({ config }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-2xl border border-amber-200 bg-amber-50 p-6", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-amber-700", children: "Chess board" }), (0, jsx_runtime_1.jsxs)("h3", { className: "mt-2 text-2xl font-bold text-slate-900", children: ["Mode: ", config.mode] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 grid grid-cols-8 gap-1 rounded-xl bg-white p-3", children: Array.from({ length: 64 }, (_, index) => ((0, jsx_runtime_1.jsx)("div", { className: `h-8 w-8 ${index % 2 === 0 ? "bg-slate-200" : "bg-slate-100"}` }, index))) })] }));
}
