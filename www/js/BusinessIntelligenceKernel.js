// ======================================================
// BusinessIntelligenceKernel.js
// KANINI REAL-TIME BUSINESS INTELLIGENCE LAYER (RBIL)
// v1 CORE KERNEL
// ======================================================

const BusinessIntelligenceKernel = (() => {

  const State = () => window.StateKernel;
  const Records = () => window.RecordsKernel;
  const Finance = () => window.FinanceKernel;

  const DAY = 86400000;

  const n = (v) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : 0;
  };

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  // ======================================================
  // SNAPSHOT
  // ======================================================
  function snapshot() {

    return {

      products:
        clone(
          State()?.getProducts?.() || []
        ),

      sales:
        clone(
          Records()?.getSales?.() || []
        ),

      movements:
        clone(
          Records()?.getInventoryMovements?.() || []
        )
    };
  }

  // ======================================================
  // PRODUCT AGGREGATOR
  // ======================================================
  function aggregateProducts() {

    const { sales } = snapshot();

    const map = {};

    sales.forEach(sale => {

      (sale.items || []).forEach(item => {

        const id = item.productId;

        if (!map[id]) {

          map[id] = {

            productId: item.productId,
            name: item.name,

            quantitySold: 0,
            revenue: 0,
            profit: 0,

            transactions: 0,

            firstSold:
              sale.timestamp,

            lastSold:
              sale.timestamp
          };
        }

        map[id].quantitySold +=
          n(item.qty);

        map[id].revenue +=
          n(item.subtotal);

        map[id].profit +=
          n(item.profit);

        map[id].transactions += 1;

        if (
          sale.timestamp >
          map[id].lastSold
        ) {
          map[id].lastSold =
            sale.timestamp;
        }

        if (
          sale.timestamp <
          map[id].firstSold
        ) {
          map[id].firstSold =
            sale.timestamp;
        }

      });

    });

    return Object.values(map);
  }

  // ======================================================
  // PRODUCT MAP
  // ======================================================
  function getProductMap() {

    const { products } =
      snapshot();

    const map = {};

    products.forEach(product => {
      map[product.id] = product;
    });

    return map;
  }

  // ======================================================
  // EXECUTIVE SUMMARY
  // ======================================================
  function getExecutiveSummary() {

    const { sales } = snapshot();

    return {

      revenue:
        Finance().getRevenue(),

      profit:
        Finance().getProfit(),

      inventoryValue:
        Finance().getInventoryValue(),

      potentialProfit:
        Finance().getPotentialProfit(),

      transactions:
        sales.length,

      itemsSold:
        Finance().getItemsSold(),

      averageSale:
        Finance().getAverageOrderValue(),

      healthScore:
        Finance().getHealthScore(),

      momentumScore:
        Finance().getMomentumScore()
    };
  }

  // ======================================================
  // FAST MOVERS
  // ======================================================
  function getFastMovers(limit = 10) {

    return aggregateProducts()

      .sort(
        (a, b) =>
          b.quantitySold -
          a.quantitySold
      )

      .slice(0, limit);
  }

  // ======================================================
  // SLOW MOVERS
  // ======================================================
  function getSlowMovers(limit = 10) {

    return aggregateProducts()

      .sort(
        (a, b) =>
          a.quantitySold -
          b.quantitySold
      )

      .slice(0, limit);
  }

  // ======================================================
  // TOP PROFIT
  // ======================================================
  function getTopProfitProducts(limit = 10) {

    return aggregateProducts()

      .sort(
        (a, b) =>
          b.profit -
          a.profit
      )

      .slice(0, limit);
  }

  // ======================================================
  // TOP REVENUE
  // ======================================================
  function getTopRevenueProducts(limit = 10) {

    return aggregateProducts()

      .sort(
        (a, b) =>
          b.revenue -
          a.revenue
      )

      .slice(0, limit);
  }

  // ======================================================
  // INVENTORY EXPOSURE
  // ======================================================
  function getInventoryExposure() {

    const { products } =
      snapshot();

    return products

      .map(product => ({

        id:
          product.id,

        name:
          product.name,

        stock:
          n(product.stock),

        value:
          n(product.stock) *
          n(product.buyingPrice)

      }))

      .sort(
        (a, b) =>
          b.value -
          a.value
      );
  }

  // ======================================================
  // SALES VELOCITY
  // ======================================================
  function getSalesVelocity() {

    return aggregateProducts()

      .map(product => {

        const daysActive = Math.max(
          1,
          Math.ceil(
            (
              product.lastSold -
              product.firstSold
            ) / DAY
          )
        );

        return {

          productId:
            product.productId,

          name:
            product.name,

          quantitySold:
            product.quantitySold,

          averageDailySales:
            Number(
              (
                product.quantitySold /
                daysActive
              ).toFixed(2)
            )
        };

      })

      .sort(
        (a, b) =>
          b.averageDailySales -
          a.averageDailySales
      );
  }

  // ======================================================
  // DEAD STOCK
  // ======================================================
  function getDeadStock(days = 30) {

    const { products } =
      snapshot();

    const salesData =
      aggregateProducts();

    const salesMap = {};

    salesData.forEach(product => {

      salesMap[
        product.productId
      ] = product;
    });

    const cutoff =
      Date.now() -
      (days * DAY);

    return products.filter(product => {

      const sold =
        salesMap[product.id];

      if (!sold) {
        return true;
      }

      return (
        sold.lastSold <
        cutoff
      );

    });

  }

  // ======================================================
  // REORDER ENGINE
  // ======================================================
  function getReorderRecommendations() {

    const products =
      getProductMap();

    return getSalesVelocity()

      .map(item => {

        const product =
          products[item.productId];

        const stock =
          n(product?.stock);

        const velocity =
          n(item.averageDailySales);

        const daysRemaining =
          velocity > 0
            ? stock / velocity
            : 9999;

        return {

          productId:
            item.productId,

          name:
            item.name,

          stock,

          averageDailySales:
            velocity,

          daysRemaining:
            Number(
              daysRemaining.toFixed(1)
            )

        };

      })

      .sort(
        (a, b) =>
          a.daysRemaining -
          b.daysRemaining
      );
  }

  // ======================================================
  // ALERTS
  // ======================================================
  function getOperationalAlerts() {

    const alerts = [];

    const lowStock =
      Finance().getLowStock(5);

    lowStock.forEach(product => {

      alerts.push({

        level:
          n(product.stock) <= 2
            ? "critical"
            : "warning",

        productId:
          product.id,

        message:
          `${product.name} stock is low (${product.stock})`
      });

    });

    getDeadStock(30)
      .forEach(product => {

        alerts.push({

          level:
            "notice",

          productId:
            product.id,

          message:
            `${product.name} has not sold recently`
        });

      });

    getReorderRecommendations()

      .slice(0, 5)

      .forEach(item => {

        if (
          item.daysRemaining <= 2
        ) {

          alerts.push({

            level:
              "critical",

            productId:
              item.productId,

            message:
              `${item.name} may run out in ${item.daysRemaining} days`
          });

        }

      });

    return alerts;
  }

  // ======================================================
  // BUSINESS PULSE
  // ======================================================
  function getBusinessPulse() {

    const health =
      Finance().getHealthScore();

    const momentum =
      Finance().getMomentumScore();

    const alerts =
      getOperationalAlerts();

    const score =
      Math.round(
        (health + momentum) / 2
      );

    let status =
      "Critical";

    if (score >= 90)
      status = "Elite";

    else if (score >= 75)
      status = "Healthy";

    else if (score >= 60)
      status = "Stable";

    else if (score >= 40)
      status = "Weak";

    return {

      score,

      status,

      alerts:
        alerts.length,

      health,

      momentum
    };
  }

  // ======================================================
  // INSIGHTS
  // ======================================================
  function generateInsights() {

    const insights = [];

    const topRevenue =
      getTopRevenueProducts(1)[0];

    const topProfit =
      getTopProfitProducts(1)[0];

    if (topRevenue) {

      insights.push({

        type:
          "positive",

        title:
          "Top Revenue Product",

        message:
          `${topRevenue.name} generated the highest revenue.`
      });

    }

    if (topProfit) {

      insights.push({

        type:
          "positive",

        title:
          "Top Profit Product",

        message:
          `${topProfit.name} generated the highest profit.`
      });

    }

    const deadStock =
      getDeadStock(30);

    if (deadStock.length) {

      insights.push({

        type:
          "warning",

        title:
          "Dead Stock",

        message:
          `${deadStock.length} products have not sold recently.`
      });

    }

    return insights;
  }

  // ======================================================
  // PUBLIC API
  // ======================================================
  return {

    getExecutiveSummary,

    getFastMovers,
    getSlowMovers,

    getTopProfitProducts,
    getTopRevenueProducts,

    getDeadStock,

    getInventoryExposure,

    getSalesVelocity,

    getReorderRecommendations,

    getOperationalAlerts,

    getBusinessPulse,

    generateInsights
  };

})();

window.BusinessIntelligenceKernel =
  BusinessIntelligenceKernel;