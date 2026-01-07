# MockChain React Demo

A simple e-commerce cart demo showcasing MockChain's time-travel debugging features.

## Features Demonstrated

- **Checkpoint Creation**: Save your cart state at any point
- **Restore**: Go back to a previous checkpoint
- **Branching**: Create alternative timelines to test different scenarios
- **Auto-capture**: All API requests are automatically captured

## Running the Demo

From the monorepo root:

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000 in your browser.

## How to Use

1. **Add products** to your cart using the "Add to Cart" buttons
2. **Open the MockChain panel** (bottom-right corner, click the chain icon)
3. **Create a checkpoint** after adding some items
4. **Continue shopping** - add more items or checkout
5. **Restore** to a checkpoint to undo your changes
6. **Create branches** to explore different scenarios without losing your main progress

## API Endpoints (Mocked)

| Method | Endpoint              | Description           |
| ------ | --------------------- | --------------------- |
| GET    | `/api/products`       | List all products     |
| GET    | `/api/cart`           | Get current cart      |
| POST   | `/api/cart/items`     | Add item to cart      |
| PATCH  | `/api/cart/items/:id` | Update item quantity  |
| DELETE | `/api/cart/items/:id` | Remove item from cart |
| DELETE | `/api/cart`           | Clear entire cart     |
| POST   | `/api/cart/checkout`  | Process checkout      |

## Tech Stack

- React 19
- Vite
- MSW (Mock Service Worker)
- MockChain packages:
  - `@mockchain/core` - State management
  - `@mockchain/msw` - MSW integration
  - `@mockchain/devtools` - React DevTools panel
