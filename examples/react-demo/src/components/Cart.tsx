import { useState, useEffect, useCallback } from 'react';
import type { CartItem } from '../mocks/handlers';

// Sample products to display
const PRODUCTS = [
  { id: 'prod-1', name: 'Wireless Headphones', price: 79.99 },
  { id: 'prod-2', name: 'Mechanical Keyboard', price: 129.99 },
  { id: 'prod-3', name: 'USB-C Hub', price: 49.99 },
  { id: 'prod-4', name: 'Monitor Stand', price: 89.99 },
];

interface CartState {
  items: CartItem[];
  total: number;
}

export function Cart() {
  const [cart, setCart] = useState<CartState>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cart data
  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart');
      const data = (await response.json()) as CartState;
      setCart(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch cart');
      console.error(err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  // Add item to cart
  const addToCart = async (product: (typeof PRODUCTS)[0]) => {
    setLoading(true);
    try {
      await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          name: product.name,
          price: product.price,
        }),
      });
      await fetchCart();
    } catch (err) {
      setError('Failed to add item');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (itemId: string) => {
    setLoading(true);
    try {
      await fetch(`/api/cart/${itemId}`, { method: 'DELETE' });
      await fetchCart();
    } catch (err) {
      setError('Failed to remove item');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      await fetch(`/api/cart/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      await fetchCart();
    } catch (err) {
      setError('Failed to update quantity');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Clear cart
  const clearCart = async () => {
    setLoading(true);
    try {
      await fetch('/api/cart', { method: 'DELETE' });
      await fetchCart();
    } catch (err) {
      setError('Failed to clear cart');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cart-container">
      {/* Products Section */}
      <section className="products-section">
        <h2>Products</h2>
        <div className="products-grid">
          {PRODUCTS.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-icon">
                {product.id === 'prod-1' && '🎧'}
                {product.id === 'prod-2' && '⌨️'}
                {product.id === 'prod-3' && '🔌'}
                {product.id === 'prod-4' && '🖥️'}
              </div>
              <h3>{product.name}</h3>
              <p className="price">${product.price.toFixed(2)}</p>
              <button
                className="add-button"
                onClick={() => void addToCart(product)}
                disabled={loading}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Cart Section */}
      <section className="cart-section">
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          {cart.items.length > 0 && (
            <button className="clear-button" onClick={() => void clearCart()} disabled={loading}>
              Clear All
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {cart.items.length === 0 ? (
          <div className="empty-cart">
            <span className="empty-icon">🛒</span>
            <p>Your cart is empty</p>
            <p className="hint">Add some products to see MockChain in action!</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.items.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">${item.price.toFixed(2)} each</span>
                  </div>
                  <div className="item-controls">
                    <button
                      className="qty-button"
                      onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                      disabled={loading}
                    >
                      -
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button
                      className="qty-button"
                      onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                      disabled={loading}
                    >
                      +
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => void removeFromCart(item.id)}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-total">
              <span>Total:</span>
              <span className="total-value">${cart.total.toFixed(2)}</span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
