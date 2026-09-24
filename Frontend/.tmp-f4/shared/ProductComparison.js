"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductComparison = ProductComparison;
const jsx_runtime_1 = require("react/jsx-runtime");
function ProductComparison({ config }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-2xl border border-slate-200 bg-white p-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-semibold text-slate-900", children: "Product comparison" }), (0, jsx_runtime_1.jsx)("div", { className: "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4", children: config.productIds.map((productId) => ((0, jsx_runtime_1.jsx)("div", { className: "rounded-xl border border-slate-200 bg-slate-50 p-4", children: (0, jsx_runtime_1.jsx)("p", { className: "font-medium text-slate-800", children: productId }) }, productId))) })] }));
}
