import { http, HttpResponse, delay } from 'msw';

// Simulated in-memory cart storage (mimics backend state)
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
}

// This is our "server-side" state
let cart: CartState = { items: [] };

// Product catalog
const products = [
  { id: 'prod-1', name: 'Mechanical Keyboard', price: 149.99 },
  { id: 'prod-2', name: 'Gaming Mouse', price: 79.99 },
  { id: 'prod-3', name: 'USB-C Hub', price: 49.99 },
  { id: 'prod-4', name: 'Monitor Stand', price: 89.99 },
  { id: 'prod-5', name: 'Webcam HD', price: 119.99 },
];

export const handlers = [
  // Get all products
  http.get('/api/products', async () => {
    await delay(100);
    return HttpResponse.json({ products });
  }),

  // Get cart
  http.get('/api/cart', async () => {
    await delay(100);
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return HttpResponse.json({
      items: cart.items,
      total: Math.round(total * 100) / 100,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  }),

  // Add item to cart
  http.post('/api/cart/items', async ({ request }) => {
    await delay(150);
    const body = (await request.json()) as { productId: string; quantity?: number };
    const { productId, quantity = 1 } = body;

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const existingItem = cart.items.find((item) => item.id === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity,
      });
    }

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return HttpResponse.json({
      items: cart.items,
      total: Math.round(total * 100) / 100,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    });
  }),

  // Update item quantity
  http.patch('/api/cart/items/:itemId', async ({ params, request }) => {
    await delay(100);
    const { itemId } = params;
    const body = (await request.json()) as { quantity: number };

    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      return HttpResponse.json({ error: 'Item not found in cart' }, { status: 404 });
    }

    if (body.quantity <= 0) {
      cart.items = cart.items.filter((i) => i.id !== itemId);
    } else {
      item.quantity = body.quantity;
    }

    const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return HttpResponse.json({
      items: cart.items,
      total: Math.round(total * 100) / 100,
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
    });
  }),

  // Remove item from cart
  http.delete('/api/cart/items/:itemId', async ({ params }) => {
    await delay(100);
    const { itemId } = params;

    cart.items = cart.items.filter((i) => i.id !== itemId);

    const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return HttpResponse.json({
      items: cart.items,
      total: Math.round(total * 100) / 100,
      itemCount: cart.items.reduce((sum, i) => sum + i.quantity, 0),
    });
  }),

  // Clear cart
  http.delete('/api/cart', async () => {
    await delay(100);
    cart = { items: [] };
    return HttpResponse.json({
      items: [],
      total: 0,
      itemCount: 0,
    });
  }),

  // Checkout (simulated)
  http.post('/api/cart/checkout', async () => {
    await delay(500);
    if (cart.items.length === 0) {
      return HttpResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const orderId = `ORD-${String(Date.now())}`;
    const orderTotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Clear cart after checkout
    cart = { items: [] };

    return HttpResponse.json({
      success: true,
      orderId,
      total: Math.round(orderTotal * 100) / 100,
      message: 'Order placed successfully!',
    });
  }),
];
