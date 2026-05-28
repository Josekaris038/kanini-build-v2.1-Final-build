// ===== TransactionKernel.js (KANINI TRANSACTION CORE v3 ATOMIC MOVEMENT ENGINE) =====

const TransactionKernel = (() => {

  // =========================================
  // KERNEL ACCESS
  // =========================================
  const State = () => window.StateKernel;
  const Cart = () => window.CartStore;
  const Bus = () => window.EventKernel;

  // =========================================
  // HELPERS
  // =========================================
  const n = (v) =>
    Number(v) || 0;

  function id(prefix) {

    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }

  // =========================================
  // VALIDATE CART
  // =========================================
  function validateCart(cart, products) {

    if (!Array.isArray(cart) || !cart.length) {

      throw new Error(
        "[TransactionKernel] Empty cart"
      );
    }

    for (const item of cart) {

      const product = products.find(
        p => String(p.id) === String(item.id)
      );

      if (!product) {

        throw new Error(
          `[TransactionKernel] Missing product ${item.id}`
        );
      }

      const stock =
        n(product.stock);

      const qty =
        n(item.qty);

      if (qty <= 0) {

        throw new Error(
          `[TransactionKernel] Invalid quantity for ${product.name}`
        );
      }

      if (stock < qty) {

        throw new Error(
          `[TransactionKernel] Insufficient stock: ${product.name}`
        );
      }
    }

    return true;
  }

  // =========================================
  // PURE TRANSACTION BUILDER
  // =========================================
  function buildTransaction(cart, products) {

    let subtotal = 0;
    let profit = 0;

    const timestamp =
      Date.now();

    const saleId =
      id("SALE");

    const items = [];

    const updatedProducts = products.map(product => {

      const cartItem = cart.find(
        c => String(c.id) === String(product.id)
      );

      if (!cartItem) {
        return product;
      }

      const qty =
        n(cartItem.qty);

      const sellingPrice =
        n(
          product.sellingPrice ??
          product.price
        );

      const buyingPrice =
        n(product.buyingPrice);

      const lineSubtotal =
        sellingPrice * qty;

      const lineProfit =
        (sellingPrice - buyingPrice) * qty;

      subtotal += lineSubtotal;
      profit += lineProfit;

      items.push({

        productId:
          product.id,

        name:
          product.name,

        qty,

        buyingPrice,

        sellingPrice,

        subtotal:
          lineSubtotal,

        profit:
          lineProfit
      });

      return {

        ...product,

        stock:
          n(product.stock) - qty
      };
    });

    // =========================================
    // BUILD SALE OBJECT
    // =========================================
    const sale = {

      saleId,

      timestamp,

      items,

      totals: {

        subtotal,

        paid:
          subtotal,

        change:
          0,

        profit
      }
    };

    // =========================================
    // BUILD MOVEMENT RECORDS
    // =========================================
    const movements = items.map(item => ({

      id:
        id("MOVE"),

      type:
        "SALE",

      saleId,

      productId:
        item.productId,

      productName:
        item.name,

      qty:
        item.qty,

      timestamp
    }));

    return {

      updatedProducts,
      sale,
      movements
    };
  }

  // =========================================
  // CREATE SALE
  // =========================================
  function createSale() {

    // =========================================
    // LOAD STATE
    // =========================================
    const cart =
      Cart().getCart();

    const products =
      State().getProducts();

    // =========================================
    // VALIDATE
    // =========================================
    validateCart(
      cart,
      products
    );

    // =========================================
    // BUILD TRANSACTION
    // =========================================
    const tx =
      buildTransaction(
        cart,
        products
      );

    // =========================================
    // PREPARE EVENT
    // =========================================
    Bus().emit(
      "transaction:prepared",
      tx.sale,
      "TransactionKernel"
    );

    // =========================================
    // UPDATE PRODUCTS
    // =========================================
    State().apply(
      "PRODUCTS_SET",
      {
        products:
          tx.updatedProducts
      }
    );

    // =========================================
    // STORE SALE
    // =========================================
    State().apply(
      "SALE_RECORD",
      {
        sale:
          tx.sale
      }
    );

    // =========================================
    // STORE MOVEMENTS
    // =========================================
    tx.movements.forEach(movement => {

      State().apply(
        "INVENTORY_MOVEMENT_ADD",
        {
          movement
        }
      );

    });

    // =========================================
    // POST COMMIT EVENT
    // =========================================
    Bus().emit(
      "sale:created",
      tx.sale,
      "TransactionKernel"
    );

    // =========================================
    // CLEAR CART
    // =========================================
    Cart().clear();

    // =========================================
    // RETURN FINAL SALE
    // =========================================
    return tx.sale;
  }

  // =========================================
  // PUBLIC API
  // =========================================
  return {

    createSale
  };

})();

window.TransactionKernel = TransactionKernel;