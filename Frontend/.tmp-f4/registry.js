"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECTION_COMPONENTS = exports.sectionSchemas = void 0;
const zod_1 = require("zod");
const Hero_1 = require("./shared/Hero");
const ProductGrid_1 = require("./shared/ProductGrid");
const Collection_1 = require("./shared/Collection");
const FeatureSection_1 = require("./shared/FeatureSection");
const ProductComparison_1 = require("./shared/ProductComparison");
const CharacterShowcase_1 = require("./anime/CharacterShowcase");
const ChessBoard_1 = require("./chess/ChessBoard");
exports.sectionSchemas = {
    hero: zod_1.z.object({
        title: zod_1.z.string(),
        subtitle: zod_1.z.string().optional(),
        imageUrl: zod_1.z.string().url(),
    }),
    product_grid: zod_1.z.object({
        title: zod_1.z.string(),
        limit: zod_1.z.number().min(1).max(50),
        categorySlug: zod_1.z.string().optional(),
    }),
    collection: zod_1.z.object({
        collectionSlug: zod_1.z.string(),
    }),
    feature_section: zod_1.z.object({
        features: zod_1.z.array(zod_1.z.object({
            title: zod_1.z.string(),
            body: zod_1.z.string(),
            icon: zod_1.z.string(),
        })),
    }),
    product_comparison: zod_1.z.object({
        productIds: zod_1.z.array(zod_1.z.string()).min(2).max(4),
    }),
    character_showcase: zod_1.z.object({
        characterIds: zod_1.z.array(zod_1.z.string()),
    }),
    chess_board: zod_1.z.object({
        mode: zod_1.z.enum(["preview", "puzzle"]),
    }),
};
exports.SECTION_COMPONENTS = {
    hero: Hero_1.Hero,
    product_grid: ProductGrid_1.ProductGrid,
    collection: Collection_1.Collection,
    feature_section: FeatureSection_1.FeatureSection,
    product_comparison: ProductComparison_1.ProductComparison,
    character_showcase: CharacterShowcase_1.CharacterShowcase,
    chess_board: ChessBoard_1.ChessBoard,
};
