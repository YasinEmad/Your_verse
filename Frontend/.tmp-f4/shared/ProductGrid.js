"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductGrid = ProductGrid;
const jsx_runtime_1 = require("react/jsx-runtime");
function ProductGrid({ config }) {
    const items = Array.from({ length: Math.min(config.limit, 4) }, (_, index) => ({
        id: index + 1,
        name: `${config.categorySlug ?? "Featured"} Product ${index + 1}`,
        price: (index + 1) * 19.99,
    }));
    return ((0, jsx_runtime_1.jsxs)("section", { className: "rounded-2xl border border-slate-200 bg-slate-50 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "mb-4 flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-semibold text-slate-900", children: config.title }), config.categorySlug ? ((0, jsx_runtime_1.jsx)("span", { className: "text-sm text-slate-500", children: config.categorySlug })) : null] }), (0, jsx_runtime_1.jsx)("div", { className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4", children: items.map((item) => ((0, jsx_runtime_1.jsxs)("div", { className: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-3 h-32 rounded-lg bg-gradient-to-br from-slate-200 to-slate-100" }), (0, jsx_runtime_1.jsx)("p", { className: "font-medium text-slate-900", children: item.name }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-2 text-sm text-slate-600", children: ["$", item.price.toFixed(2)] })] }, item.id))) })] }));
}
