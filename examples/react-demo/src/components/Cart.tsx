import { useState, useEffect, useCallback } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartData {
  items: CartItem[];
  total: number;
  itemCount: number;
}

interface ProductsResponse {
  products: Product[];
}

interface CheckoutSuccessResponse {
  success: true;
  orderId: string;
  total: number;
}

interface CheckoutErrorResponse {
  success?: false;
  error: string;
}

type CheckoutResponse = CheckoutSuccessResponse | CheckoutErrorResponse;

export function Cart() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartData>({ items: [], total: 0, itemCount: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    const res = await fetch('/api/products');
    const data = (await res.json()) as ProductsResponse;
    setProducts(data.products);
  }, []);

  // Fetch cart
  const fetchCart = useCallback(async () => {
    const res = await fetch('/api/cart');
    const data = (await res.json()) as CartData;
    setCart(data);
  }, []);

  useEffect(() => {
    void fetchProducts();
    void fetchCart();
  }, [fetchProducts, fetchCart]);

  // Add to cart
  const addToCart = useCallback(async (productId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = (await res.json()) as CartData;
      setCart(data);
      setMessage('Item added to cart!');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update quantity
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      const data = (await res.json()) as CartData;
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Remove from cart
  const removeFromCart = useCallback(async (itemId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      const data = (await res.json()) as CartData;
      setCart(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear cart
  const clearCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cart', { method: 'DELETE' });
      const data = (await res.json()) as CartData;
      setCart(data);
      setMessage('Cart cleared');
    } finally {
      setLoading(false);
    }
  }, []);

  // Checkout
  const checkout = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cart/checkout', { method: 'POST' });
      const data = (await res.json()) as CheckoutResponse;
      if ('success' in data && data.success) {
        setCart({ items: [], total: 0, itemCount: 0 });
        setMessage(`Order ${data.orderId} placed! Total: $${String(data.total)}`);
      } else if ('error' in data) {
        setMessage(data.error);
      } else {
        setMessage('Checkout failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Event handlers that wrap async functions
  const handleAddToCart = useCallback(
    (productId: string) => {
      void addToCart(productId);
    },
    [addToCart]
  );

  const handleUpdateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      void updateQuantity(itemId, quantity);
    },
    [updateQuantity]
  );

  const handleRemoveFromCart = useCallback(
    (itemId: string) => {
      void removeFromCart(itemId);
    },
    [removeFromCart]
  );

  const handleClearCart = useCallback(() => {
    void clearCart();
  }, [clearCart]);

  const handleCheckout = useCallback(() => {
    void checkout();
  }, [checkout]);

  return (
    <div style={styles.container}>
      {/* Products Section */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Products</h2>
        <div style={styles.productGrid}>
          {products.map((product) => (
            <div key={product.id} style={styles.productCard}>
              <div style={styles.productName}>{product.name}</div>
              <div style={styles.productPrice}>${product.price.toFixed(2)}</div>
              <button
                style={styles.addButton}
                onClick={() => {
                  handleAddToCart(product.id);
                }}
                disabled={loading}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Cart Section */}
      <section style={styles.section}>
        <div style={styles.cartHeader}>
          <h2 style={styles.sectionTitle}>Shopping Cart ({cart.itemCount} items)</h2>
          {cart.items.length > 0 && (
            <button style={styles.clearButton} onClick={handleClearCart} disabled={loading}>
              Clear Cart
            </button>
          )}
        </div>

        {message && <div style={styles.message}>{message}</div>}

        {cart.items.length === 0 ? (
          <div style={styles.emptyCart}>Your cart is empty</div>
        ) : (
          <>
            <div style={styles.cartItems}>
              {cart.items.map((item) => (
                <div key={item.id} style={styles.cartItem}>
                  <div style={styles.itemInfo}>
                    <div style={styles.itemName}>{item.name}</div>
                    <div style={styles.itemPrice}>
                      ${item.price.toFixed(2)} x {item.quantity} = $
                      {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  <div style={styles.itemActions}>
                    <button
                      style={styles.qtyButton}
                      onClick={() => {
                        handleUpdateQuantity(item.id, item.quantity - 1);
                      }}
                      disabled={loading}
                    >
                      -
                    </button>
                    <span style={styles.qtyValue}>{item.quantity}</span>
                    <button
                      style={styles.qtyButton}
                      onClick={() => {
                        handleUpdateQuantity(item.id, item.quantity + 1);
                      }}
                      disabled={loading}
                    >
                      +
                    </button>
                    <button
                      style={styles.removeButton}
                      onClick={() => {
                        handleRemoveFromCart(item.id);
                      }}
                      disabled={loading}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.cartFooter}>
              <div style={styles.total}>Total: ${cart.total.toFixed(2)}</div>
              <button
                style={styles.checkoutButton}
                onClick={handleCheckout}
                disabled={loading || cart.items.length === 0}
              >
                Checkout
              </button>
            </div>
          </>
        )}
      </section>

      {/* Instructions */}
      <section style={styles.instructions}>
        <h3 style={styles.instructionsTitle}>MockChain Demo Instructions</h3>
        <ol style={styles.instructionsList}>
          <li>Add some products to your cart (this generates API requests)</li>
          <li>Open the MockChain panel (bottom-right corner)</li>
          <li>Click "Checkpoint" to save your current cart state</li>
          <li>Add more items or checkout</li>
          <li>Click "Restore" on a checkpoint to go back in time!</li>
          <li>Try "Branch" to test different scenarios without losing your progress</li>
        </ol>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 20,
  },
  section: {
    background: '#fff',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    margin: '0 0 16px 0',
    fontSize: 20,
    fontWeight: 600,
    color: '#333',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 16,
  },
  productCard: {
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
  },
  productName: {
    fontWeight: 500,
    marginBottom: 8,
    color: '#333',
  },
  productPrice: {
    color: '#4ade80',
    fontWeight: 600,
    fontSize: 18,
    marginBottom: 12,
  },
  addButton: {
    background: '#4ade80',
    color: '#000',
    border: 'none',
    borderRadius: 4,
    padding: '8px 16px',
    cursor: 'pointer',
    fontWeight: 500,
    width: '100%',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 12,
  },
  message: {
    background: '#e0f2fe',
    color: '#0369a1',
    padding: '10px 16px',
    borderRadius: 4,
    marginBottom: 16,
  },
  emptyCart: {
    textAlign: 'center',
    color: '#888',
    padding: 40,
    fontStyle: 'italic',
  },
  cartItems: {
    borderTop: '1px solid #e0e0e0',
  },
  cartItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #e0e0e0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: 500,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    background: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 16,
  },
  qtyValue: {
    minWidth: 30,
    textAlign: 'center',
    fontWeight: 500,
  },
  removeButton: {
    background: 'transparent',
    color: '#ef4444',
    border: '1px solid #ef4444',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 12,
    marginLeft: 8,
  },
  cartFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0 0 0',
  },
  total: {
    fontSize: 20,
    fontWeight: 600,
    color: '#333',
  },
  checkoutButton: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '12px 24px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 16,
  },
  instructions: {
    background: '#1a1a2e',
    color: '#eee',
    borderRadius: 8,
    padding: 20,
  },
  instructionsTitle: {
    margin: '0 0 12px 0',
    color: '#4ade80',
    fontSize: 16,
  },
  instructionsList: {
    margin: 0,
    paddingLeft: 20,
    lineHeight: 1.8,
    fontSize: 14,
  },
};
