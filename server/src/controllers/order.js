import asyncHandler from 'express-async-handler';
import { orderModel } from "../models/order.js";
import { productModel } from "../models/product.js";
import { AppError } from "../utils/appError.js";

export const createOrder = asyncHandler(async (req, res, next) => {
    const { products, shippingAddress, phone } = req.body;
    let totalPrice = 0;

    for (let item of products) {
        const product = await productModel.findById(item.product);
        if (!product) {
            return next(new AppError(`Product ${item.product} not found`, 404));
        }
        totalPrice += product.price * item.quantity;
    }

    const newOrder = await orderModel.create({
        user: req.user.id,
        products,
        totalPrice,
        shippingAddress,
        phone
    });

    res.status(201).json({
        success: true,
        order: newOrder
    });
});

export const getAllOrders = asyncHandler(async (req, res, next) => {
    let query = {};
    if (req.user.role !== 'admin') {
        query.user = req.user.id;
    }

    const orders = await orderModel.find(query)
        .populate('user', 'userName email')
        .populate('products.product', 'makeupName price');

    res.json({
        success: true,
        results: orders.length,
        orders
    });
});