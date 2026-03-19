import asyncHandler from 'express-async-handler';
import { productModel } from '../models/product.js';
import { AppError } from '../utils/appError.js';

export const getAllProducts = asyncHandler(async (req, res, next) => {
    const { category, search, page, limit } = req.query;
    let query = {};

    if (category) query.category = category;
    if (search) {
        query.$or = [
            { makeupName: { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } }
        ];
    }

    const currentPage = parseInt(page) || 1;
    const currentLimit = parseInt(limit) || 12;
    const skip = (currentPage - 1) * currentLimit;

    const products = await productModel.find(query)
        .select('-__v')
        .skip(skip)
        .limit(currentLimit);

    const total = await productModel.countDocuments(query);

    res.json({
        success: true,
        results: products.length,
        total,
        products
    });
});

export const getProductById = asyncHandler(async (req, res, next) => {
    const product = await productModel.findById(req.params.id);
    
    if (!product) {
        return next(new AppError('Product not found with that ID', 404));
    }
    
    res.json({
        success: true,
        product
    });
});

export const addProduct = asyncHandler(async (req, res, next) => {
    const newProduct = await productModel.create(req.body);
    res.status(201).json({
        success: true,
        product: newProduct
    });
});

export const updateProduct = asyncHandler(async (req, res, next) => {
    const product = await productModel.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }

    res.json({
        success: true,
        product
    });
});

export const deleteById = asyncHandler(async (req, res, next) => {
    const product = await productModel.findByIdAndDelete(req.params.id);
    
    if (!product) {
        return next(new AppError('No product found with that ID', 404));
    }
    
    res.json({
        success: true,
        message: "Product deleted successfully"
    });
});