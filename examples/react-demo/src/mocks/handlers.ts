import { http, HttpResponse, delay } from 'msw';

// Types for our cart API
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

// In-memory cart storage (simulates a database)
let cartItems: CartItem[] = [];
let nextId = 1;

export const handlers = [
  // GET /api/cart - Get all cart items
  http.get('/api/cart', async () => {
    await delay(100); // Simulate network delay
    return HttpResponse.json({
      items: cartItems,
      total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    });
  }),

  // POST /api/cart - Add item to cart
  http.post('/api/cart', async ({ request }) => {
    await delay(150);
    const body = (await request.json()) as {
      productId: string;
      name: string;
      price: number;
      quantity?: number;
    };

    // Check if item already exists
    const existingItem = cartItems.find((item) => item.productId === body.productId);
    if (existingItem) {
      existingItem.quantity += body.quantity ?? 1;
      return HttpResponse.json(existingItem, { status: 200 });
    }

    // Create new cart item
    const newItem: CartItem = {
      id: String(nextId++),
      productId: body.productId,
      name: body.name,
      price: body.price,
      quantity: body.quantity ?? 1,
    };
    cartItems.push(newItem);
    return HttpResponse.json(newItem, { status: 201 });
  }),

  // DELETE /api/cart/:id - Remove item from cart
  http.delete('/api/cart/:id', async ({ params }) => {
    await delay(100);
    const { id } = params;
    const index = cartItems.findIndex((item) => item.id === id);

    if (index === -1) {
      return HttpResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const removed = cartItems.splice(index, 1)[0];
    return HttpResponse.json(removed);
  }),

  // PATCH /api/cart/:id - Update item quantity
  http.patch('/api/cart/:id', async ({ params, request }) => {
    await delay(100);
    const { id } = params;
    const body = (await request.json()) as { quantity: number };

    const item = cartItems.find((i) => i.id === id);
    if (!item) {
      return HttpResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    item.quantity = body.quantity;
    if (item.quantity <= 0) {
      cartItems = cartItems.filter((i) => i.id !== id);
      return HttpResponse.json({ removed: true });
    }

    return HttpResponse.json(item);
  }),

  // DELETE /api/cart - Clear entire cart
  http.delete('/api/cart', async () => {
    await delay(100);
    cartItems = [];
    return HttpResponse.json({ cleared: true });
  }),
];
