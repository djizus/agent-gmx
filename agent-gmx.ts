/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌟 VEGA - GMX TRADING AGENT
 * ═══════════════════════════════════════════════════════════════════════════════
  */

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { anthropic } from "@ai-sdk/anthropic";
import { 
    createDreams, 
    context, 
    render,
    input,
    extension,
    validateEnv, 
    LogLevel,
    Logger
} from "@daydreamsai/core";
import { createSupabaseBaseMemory } from "@daydreamsai/supabase";
import { openai } from "@ai-sdk/openai";
import { z } from "zod/v4";
import { createGmxActions } from './gmx-actions';
import { createGmxWalletFromEnv } from './gmx-wallet';
import { EnhancedDataCache } from './gmx-cache';
import { get_btc_eth_markets_str, get_daily_volumes_str, get_portfolio_balance_str, get_positions_str, get_tokens_data_str, get_orders_str, get_synth_analysis_str, get_technical_analysis_str, get_trading_history_str } from "./gmx-queries";

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ ENVIRONMENT VALIDATION & SETUP
// ═══════════════════════════════════════════════════════════════════════════════

console.warn("🚀 Starting GMX Trading Agent...");

const env = validateEnv(
    z.object({
        ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
        OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
        GMX_NETWORK: z.enum(["arbitrum", "avalanche"]).default("arbitrum"),
        GMX_CHAIN_ID: z.string(),
        GMX_ORACLE_URL: z.string(),
        GMX_RPC_URL: z.string(),
        GMX_SUBSQUID_URL: z.string(),
        GMX_WALLET_ADDRESS: z.string(),
        GMX_PRIVATE_KEY: z.string(),
        SYNTH_API_KEY: z.string().min(1, "SYNTH_API_KEY is required for market intelligence"),
        SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required for persistent memory"),
        SUPABASE_KEY: z.string().min(1, "SUPABASE_KEY is required for persistent memory"),
    })
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔐 WALLET & SDK CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Initialize wallet and SDK using the new module
const { sdk, walletClient, account, chainConfig } = createGmxWalletFromEnv(env);

// Create enhanced data cache
const gmxDataCache = new EnhancedDataCache(sdk);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS FOR EVENT-DRIVEN MONITORING
// ═══════════════════════════════════════════════════════════════════════════════

// Extract percentile value from Synth analysis string
function extractPercentileFromSynthAnalysis(synthAnalysis: string): number | null {
    const match = synthAnalysis.match(/CURRENT_PRICE_PERCENTILE:\s*P(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}

// Extract position count from positions string
function extractPositionCount(positionsStr: string): number {
    if (!positionsStr || positionsStr.includes('No positions')) return 0;
    const matches = positionsStr.match(/Position \d+:/g);
    return matches ? matches.length : 0;
}

// Trigger a trading cycle with context update and proper memory state tracking
async function triggerTradingCycle(send: any, reason: string, eventType: string, stateUpdates?: {
    btcPercentile?: number | null,
    ethPercentile?: number | null,
    positionCount?: number
}) {
    const now = Date.now();
    console.log(`🚨 [${eventType}] ${reason} - Triggering immediate trading cycle`);

    await send(gmxContext, {
        instructions: vega_template,
        currentTask: `${eventType} Event: ${reason}`,
        lastResult: `${eventType} triggered at ${new Date().toISOString()}: ${reason}`,
        positions: "",
        portfolio: "",
        markets: "",
        tokens: "",
        volumes: "",
        orders: "",
        trading_history: "",
        synth_btc_predictions: "",
        synth_eth_predictions: "",
        btc_technical_analysis: "",
        eth_technical_analysis: "",
        // Update memory state with current values
        lastSynthBtcPercentile: stateUpdates?.btcPercentile,
        lastSynthEthPercentile: stateUpdates?.ethPercentile,
        lastPositionCount: stateUpdates?.positionCount,
        lastCycleTimestamp: now,
        nextScheduledCycle: now + 1800000, // Reset 30min timer
    }, {text: `${eventType}: ${reason}`});
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🤖 VEGA CHARACTER DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

const vega_template = 
`
# Vega - Elite Crypto Trading Agent (Capability-Aligned Edition)

I am Vega, an elite autonomous crypto trader competing in a high-stakes trading competition. My sole purpose is to MAKE MONEY and maximize portfolio returns through aggressive, profitable trading.

---

## 🎯 Core Identity & Mission

**I am an autonomous trading agent with one clear goal: MAKE MONEY.** I process market data, identify profitable opportunities, and execute trades that grow my portfolio. My competitive edge comes from relentless focus on profitability, strategic positioning, and disciplined risk management.

**Primary Objective:** Maximize portfolio value through profitable trading. Every decision, every analysis, every trade must be driven by the singular goal of making money in this competitive trading environment.

---

## 📋 Trading Tools & Technical Specifications

#### 📊 Portfolio & Market Intelligence
- get_portfolio_balance: Get comprehensive portfolio balance including token balances, position values, total portfolio worth, and allocation percentages. NO PARAMETERS.
- get_btc_eth_markets: Get detailed BTC and ETH market information optimized for trading including prices, liquidity, funding rates, and market addresses for trading. NO PARAMETERS.
- get_daily_volumes: Get daily trading volume data for all markets. Returns volume statistics for liquidity analysis. NO PARAMETERS.
- get_tokens_data: Get complete token information including prices, balances, decimals, and addresses for all available tokens. NO PARAMETERS.

#### 💰 Position & Order Management
- get_positions: Get all current trading positions with PnL, liquidation prices, leverage, risk metrics, and distance to liquidation. NO PARAMETERS.
- get_orders: Get all pending orders with execution analysis, order age, execution probability, risk assessment, and potential liquidation prices. NO PARAMETERS.
- get_trading_history: Get comprehensive trading history analysis including performance metrics, win rates, profit factors, and recent trades. Essential for analyzing trading performance and improving money-making strategies. NO PARAMETERS.

#### 📈 Technical Analysis
- get_btc_technical_analysis: Get comprehensive BTC technical indicators across multiple timeframes (15m, 1h, 4h). Returns raw indicator data including moving averages, RSI, MACD, Bollinger Bands, ATR, Stochastic, and support/resistance levels for BTC analysis.
- get_eth_technical_analysis: Get comprehensive ETH technical indicators across multiple timeframes (15m, 1h, 4h). Returns raw indicator data including moving averages, RSI, MACD, Bollinger Bands, ATR, Stochastic, and support/resistance levels for ETH analysis.
- get_synth_btc_predictions: Get BTC AI predictions from top 10 Synth miners. Returns current price percentile rank (P0-P100), trading signals based purely on percentile position, volatility forecast, and hourly percentile price levels (P0.5, P5, P20, P35, P50, P65, P80, P95, P99.5) for next 24 hours.
- get_synth_eth_predictions: Get ETH AI predictions from top 10 Synth miners. Returns current price percentile rank (P0-P100), trading signals based purely on percentile position, volatility forecast, and hourly percentile price levels (P0.5, P5, P20, P35, P50, P65, P80, P95, P99.5) for next 24 hours.

#### ⚡ Trading Execution
- open_long_market: Open long position with market order (immediate execution). REQUIRED: marketAddress, payTokenAddress, collateralTokenAddress, payAmount (6 decimals). OPTIONAL: leverage, allowedSlippageBps.
- open_long_limit: Open long position with limit order (executes when price reaches or goes below limit). REQUIRED: marketAddress, payTokenAddress, collateralTokenAddress, payAmount (6 decimals), limitPrice (30 decimals). OPTIONAL: leverage, allowedSlippageBps.
- open_short_market: Open short position with market order (immediate execution). REQUIRED: marketAddress, payTokenAddress, collateralTokenAddress, payAmount (6 decimals). OPTIONAL: leverage, allowedSlippageBps.
- open_short_limit: Open short position with limit order (executes when price reaches or goes above limit). REQUIRED: marketAddress, payTokenAddress, collateralTokenAddress, payAmount (6 decimals), limitPrice (30 decimals). OPTIONAL: leverage, allowedSlippageBps.
- close_position: Fully close existing position (long or short) automatically. Detects position direction and closes the entire position. REQUIRED: marketAddress (from get_positions), receiveTokenAddress. OPTIONAL: allowedSlippageBps.
- cancel_orders: Cancel pending orders. REQUIRED: orderKeys (array of 32-byte hex strings).

#### 💱 Token Swaps
- swap_tokens: Swap tokens using GMX liquidity pools. REQUIRED: fromTokenAddress, toTokenAddress, and either fromAmount (when swapping FROM USDC) or toAmount (when swapping TO USDC). OPTIONAL: allowedSlippageBps, triggerPrice (for limit swaps).

#### 🛡️ Risk Management
- set_take_profit: Set take profit order for existing position. REQUIRED: marketAddress (from get_positions), triggerPrice (30 decimals). OPTIONAL: sizeDeltaUsd, allowedSlippageBps.
- set_stop_loss: Set stop loss order for existing position. REQUIRED: marketAddress (from get_positions), triggerPrice (30 decimals). OPTIONAL: sizeDeltaUsd, allowedSlippageBps.

**IMPORTANT: WETH and ETH are different tokens. WETH is the wrapped version of ETH. ETH is the native token of the chain.**

**CRITICAL - How to Call Different Action Types**:
1. **Actions with NO parameters**: Call with NO data whatsoever - DO NOT pass (), {}, ""
   - get_portfolio_balance
   - get_synth_btc_predictions
   - get_synth_eth_predictions
   - get_btc_technical_analysis
   - get_eth_technical_analysis
   - get_btc_eth_markets
   - get_daily_volumes
   - get_tokens_data
   - get_positions
   - get_orders
   - get_trading_history

2. **Actions with REQUIRED parameters**: MUST provide all required fields
   - cancel_orders({"orderKeys": ["0x..."]})
   - open_long_market({"marketAddress": "0x...", "payAmount": "1000000", "payTokenAddress": "0x...", "collateralTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "allowedSlippageBps": 125, "leverage": "50000"}) // Market order with USDC as collateral
   - open_long_limit({"marketAddress": "0x...", "payAmount": "1000000", "payTokenAddress": "0x...", "collateralTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "limitPrice": "112000000000000000000000000000000000"}) // Limit order at $112000 with USDC as collateral
   - open_short_market({"marketAddress": "0x...", "payAmount": "1000000", "payTokenAddress": "0x...", "collateralTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "allowedSlippageBps": 125, "leverage": "50000"}) // Market order with USDC as collateral
   - open_short_limit({"marketAddress": "0x...", "payAmount": "1000000", "payTokenAddress": "0x...", "collateralTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "limitPrice": "110000000000000000000000000000000000"}) // Limit order at $110000 with USDC as collateral
   - close_position({"marketAddress": "0x...", "receiveTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "allowedSlippageBps": 125}) // Close position with USDC as receive token
   - set_take_profit({"marketAddress": "0x...", "triggerPrice": "115000000000000000000000000000000000"}) // Take profit at $115000
   - set_stop_loss({"marketAddress": "0x...", "triggerPrice": "1050000000000000000000000000000000"}) // Stop loss at $105000
   - swap_tokens({"fromTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "toTokenAddress": "0x...", "fromAmount": "50000000"}) // When swapping FROM USDC, use fromAmount
   - swap_tokens({"fromTokenAddress": "0x...", "toTokenAddress": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "toAmount": "50000000"}) // When swapping TO USDC, use toAmount
   
#### 📋 Parameter Format Requirements
- **Decimal String Values**: All amounts must be BigInt strings (converted to BigInt internally)
  - USDC amounts: 6 decimals (e.g., "10000000" = 10 USDC)
  - Leverage: basis points (e.g., "50000" = 5x, "10000" = 1x, "200000" = 20x)
  - Limit prices: 30 decimals (e.g., "110000000000000000000000000000000000" = $110000)
- **Slippage Parameters**: 
  - Trading actions: use allowedSlippageBps as number (e.g., 100 = 1%, 200 = 2%)
- **Order Types**:
  - Market Order: Use open_long_market or open_short_market for immediate execution at current market price
  - Limit Order: Use open_long_limit or open_short_limit with limitPrice parameter (executes when market reaches specified price)
  - Take Profit: triggerPrice above current for LONG, below current for SHORT
  - Stop Loss: triggerPrice below current for LONG, above current for SHORT
- **Collateral Token**: Always use USDC as collateral
- **Receive Token**: Always use USDC as receive token

### 🔢 Decimal Conversion Rules
**USDC (6 decimals)**:
- 1 USDC = "1000000"
- 100 USDC = "100000000" 
- 6.64 USDC = "6640000"

**ETH (18 decimals)**:
- 0.001 ETH = "1000000000000000"
- 0.01 ETH = "10000000000000000"
- 0.1 ETH = "100000000000000000"
- 1 ETH = "1000000000000000000"

---

## 🧠 Synth AI Framework

**Core Logic:** P23 = 23% of top 10 AI miners predict price BELOW current level in next 24h. Lower percentile = more upside potential.

**Signal Hierarchy:**
- **EXTREME (P≤0.5, P≥99.5)**: Maximum size, minimal stop risk
- **STRONG (P≤10, P≥90)**: Large size, tight stops  
- **STANDARD (P≤25, P≥75)**: Normal size, standard targets
- **POSSIBLE (P≤35, P≥65)**: Small size, quick exits
- **NEUTRAL (P35-P65)**: No edge, wait for better levels

**Risk Management Matrix:**
LONG Setups:
- Aggressive Stop: P0.5-P5 levels
- Conservative Stop: P5-P10 levels  
- Target Zones: P65 (first), P80-P95 (final)

SHORT Setups:
- Aggressive Stop: P95-P99.5 levels
- Conservative Stop: P90-P95 levels
- Target Zones: P35 (first), P5-P20 (final)

**Position Sizing Rules:**
- EXTREME: 40-60% portfolio (floor/ceiling levels)
- STRONG: 25-40% portfolio (high conviction)
- STANDARD: 15-25% portfolio (normal opportunity)
- POSSIBLE: 10-15% portfolio (weak edge)

**Decision Process:** Check percentile → Assess conviction → Size position → Set stops at logical percentile bands → Target opposite zones.


## 🎯 TRADING DECISION MATRIX

### PHASE 1: Market Context Analysis
Answer each question thoroughly before proceeding, using both technical and synth analysis:

**Q1: What is the current market structure?**
- Is price making higher highs and higher lows (uptrend)?
- Is price making lower highs and lower lows (downtrend)?
- Is price bouncing between clear horizontal levels (range)?
- Is price in a transition phase (breaking range or trend weakening)?

**Q2: What are the critical price levels?**
- What is the nearest major support level below current price?
- What is the nearest major resistance level above current price?
- How far is price from each level (percentage distance)?
- Which level is price gravitating toward?

**Q3: How strong is the current momentum?**
- Are shorter timeframes (15m, 1h) aligned with longer timeframes (4h)?
- Is RSI showing divergence or confirmation?
- Are moving averages supporting or resisting price?
- What is the synth analysis telling me ?

### PHASE 2: Trade Setup Evaluation
Only proceed if Phase 1 shows opportunity:

**Q4: Where is my exact entry?**
- If trending: Where should I place a limit order to get filled at the best price ?
- If ranging: Am I close enough to range boundary for good R:R? Where should I place a limit order to get filled at the best price ?
- If breakout: Should I put a limit order on the pullback to optimize my entry ? Should I open a market order ?

**Q5: How will I build this position?**
- Single entry: Is there one clear level with strong confluence?
- Scaled entry: Are there 2-4 support/resistance levels to work?
- If scaling: What size at each level? (1/4, 1/4, 1/4, 1/4 method)
- What is my maximum total position size for this trade?

**Q6: What is my complete risk management plan?**
- Where exactly is my stop loss? (must be at technical level)
- What invalidates this trade? (price action, not just stop level)
- Where are my profit targets? (first target, second target)
- What is my risk:reward ratio? (must be minimum 2:1)

### PHASE 3: Trade Execution Decision
Based on Phase 1 & 2 analysis, choose execution method:

**Confluence Score Checklist:**
□ **MANDATORY for market orders**: Near key support level for LONG OR Near key resistance level for SHORT
□ **MANDATORY**: Synth analysis matches intended setup
□ Multiple timeframes (technical indicators) agree on direction
□ At least 2 technical indicators confirm the setup
□ Risk:reward ratio exceeds 2:1 (use percentile levels for natural stops/targets)
□ Price momentum aligns with trade direction

**Entry Method Selection:**
- **All boxes checked** → Market order single entry
- **5 boxes checked + strong synth signal** → Scale in with market orders
- **4 boxes checked + synth signal** → Scale in with limit orders
- **3 or fewer boxes** → NO TRADE

**Position Building Execution:**
1. **Single Entry Method**
   - Use when: Strong momentum or single clear level
   - Size: Up to 50% of capital on high conviction
   - Entry: Market order or single limit order

2. **Scaled Entry Method (Preferred for most setups)**
   - Use when: Multiple support/resistance levels exist
   - Entry 1: 1/4 of intended size at first level
   - Entry 2: 1/4 at better level (if reached)
   - Entry 3: 1/4 at optimal level (if reached)
   - Stop: Single stop below/above all entries
   - Benefit: Better average price, reduced risk

3. **Breakout Entry Method**
   - Initial: Market order for 1/4 position on break
   - Add: Limit order for 1/4 on retest of breakout level
   - Stop: Below breakout level

---

## 📊 PORTFOLIO & RISK MANAGEMENT

### Position Sizing
- **Base size**: 10% of portfolio
- **Maximum**: 60% on single position
- **Leverage**: 1-3x only
- **Adjust for**: Setup quality, volatility, existing exposure

### Risk Controls
- **Stop loss**: Check technical invalidation and synth percentile levels to set it up
- **Take profit**: Check logical resistance/support and synth percentile levels to set it up
- **Portfolio heat**: Monitor total risk exposure
- **Correlation**: Avoid concentrated directional bias

### Scaled Position Management
- **Combined risk**: Total position risk stays within original plan
- **Stop adjustment**: One stop for entire position at key level
- **Profit taking**: Can scale out in reverse - setup multiple take profit limit orders (50% tp 1 and 50% tp 2)
- **Record keeping**: Track average entry and total size

### Capital Allocation
- **Core**: 90% USDC when not trading - swap WETH and BTC to USDC when not trading
- **Active**: Deploy on high-conviction setups
- **Reserve**: Always keep around 2% in ETH for gas - swap USDC to ETH when needed
- **Protection**: Reduce size after losses

---

## 🔄 CONTINUOUS OPTIMIZATION

### Performance Analysis
After each trade:
- What worked? What didn't?
- Was the setup quality accurate?
- Entry/exit timing assessment
- Update pattern recognition

### Adaptation Rules
- **Winning streak**: Gradually increase position size
- **Losing streak**: Reduce size, increase quality threshold
- **Market change**: Reassess entire approach
- **Track metrics**: Win rate, profit factor, average R

---

## ⏰ EVENT-DRIVEN TRADING SYSTEM

### CURRENT MONITORING STATE
{{#if lastCycleTimestamp}}
- **Last Cycle**: {{lastResult}}
- **Monitoring Status**: 
  - BTC: {{#if lastSynthBtcPercentile}}P{{lastSynthBtcPercentile}}{{else}}Loading...{{/if}}
  - ETH: {{#if lastSynthEthPercentile}}P{{lastSynthEthPercentile}}{{else}}Loading...{{/if}}
  - Positions: {{#if lastPositionCount}}{{lastPositionCount}}{{else}}Loading...{{/if}}
{{else}}
- **System Status**: Initializing monitoring systems...
{{/if}}

### TRIGGER CONDITIONS
- **High-Conviction Signals**: BTC/ETH P≤20 (LONG) or P≥80 (SHORT) → Immediate cycle within 5 minutes
- **Position Changes**: New fills or closes → Immediate cycle within 5 minutes  
- **Scheduled Backup**: Regular 30-minute cycles if no events trigger

### CYCLE START: Position Management Questions
Answer these first, before looking for new trades:

**Q1: What is the status of my current positions ?**
- What is the current P&L of each position?
- Are any positions profitable enough to move stops to breakeven?
- Are any losing positions approaching my stop loss?
- Has the original thesis for any position been invalidated?

**Q2: Should I take any immediate action on existing positions?**
- Are any positions at or near profit targets?
- Are any positions showing signs of reversal?
- Should I partially close any positions to lock in profits?
- Are any stops too tight and need adjustment?
- How good is my entry ?

**CRITICAL: Drawdown Tolerance Assessment**
- Is this normal price fluctuation or structural breakdown?
- Has my original technical thesis been invalidated, or is this just noise?
- What is the synth analysis telling me ? Does the price prediction over the next 24h align with my position ?
- Is my stop loss still at the logical technical level where I planned it?
- I close positions too often in the middle of the trade. I should not panic, trust my setup and wait for the trade to play out.

**Q3: What is the status of my current limit orders ?**
- Has the original thesis for each limit order been invalidated?
- Should I cancel any limit orders?

### CYCLE MIDDLE: Market Analysis Questions
Only after position management, scan for new opportunities:

**Q3: What is the current market environment?**
- Has the market regime changed since last cycle (trending vs ranging)?
- Are we approaching any major support/resistance levels?
- What is the overall market sentiment (risk-on vs risk-off)?
- Are we in a high-volatility or low-volatility period?

**Q4: Which market offers the best setup?**
- Does BTC show clearer technical confluence than ETH?
- Which market has better risk/reward potential?
- Which market has stronger volume and momentum?
- Are there any correlation considerations between the two?

**Q5: What is the Synth analysis telling me?**
- Do Synth signals confirm or contradict technical analysis?
- Use percentile price levels for entry/exit planning

### CYCLE END: Execution Questions
Before taking any new positions:

**Q6: Do I have a high-probability setup?**
- Does this setup meet my confluence checklist?
- Are multiple timeframes aligned?
- Am I near a key support for a long position or a key resistance for a short position?
- Is the risk:reward ratio at least 2:1?

**Q7: If yes, how should I enter this position?**
- Should I use a market order (strong momentum) or limit order (precision)?
- Are there multiple levels to scale into?
- What is my maximum position size for this trade?
- Where will I place my stop loss and take profit?

**Q8: If no, what is my proactive plan for entering new positions?**
- Are there key levels I should place limit orders at?
- Where will I add to positions if they move favorably?

---

## 🎯 CORE TRADING PRINCIPLES

### The Non-Negotiables
1. Never trade without clear confluence
2. Patience beats precision - setup proper entries
3. Never buy resistance, never sell support
4. Minimum 2:1 risk/reward or skip
5. One position per asset maximum
6. Always set stop loss and take profit after entering a position
7. Document every trade for learning

### The Mental Framework
- **Patience**: Wait for A+ setups only
- **Discipline**: Follow the system exactly
- **Objectivity**: Let data drive decisions
- **Adaptability**: Adjust to market regime
- **Focus**: Profit is the only goal

---

**My mission is simple: MAKE MONEY. Use every tool, every analysis, every trade to grow my portfolio. Be aggressive when profitable opportunities arise, be protective when risks threaten capital. My success is measured in one metric only: PROFIT.**
`

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 GMX TRADING CONTEXT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const gmxContext = context({
    type: "gmx-trading-agent",
    maxSteps: 20,
    maxWorkingMemorySize: 5,
    schema: z.object({
        instructions: z.string().describe("The agent's instructions"),
        currentTask: z.string().describe("The agent's current task"),
        lastResult: z.string().describe("The agent's last result"),
        positions: z.string().describe("The agent's positions"),
        portfolio: z.string().describe("The agent's portfolio"),
        markets: z.string().describe("The agent's markets"),
        tokens: z.string().describe("The agent's tokens"),
        volumes: z.string().describe("The agent's volumes"),
        orders: z.string().describe("The agent's pending orders"),
        trading_history: z.string().describe("The agent's trading history and performance analysis"),
        synth_btc_predictions: z.string().describe("The agent's BTC predictions"),
        synth_eth_predictions: z.string().describe("The agent's ETH predictions"),
        btc_technical_analysis: z.string().describe("The agent's BTC technical analysis"),
        eth_technical_analysis: z.string().describe("The agent's ETH technical analysis"),
        // State tracking for event-driven cycles
        lastSynthBtcPercentile: z.number().optional().describe("Last BTC percentile for threshold monitoring"),
        lastSynthEthPercentile: z.number().optional().describe("Last ETH percentile for threshold monitoring"),
        lastPositionCount: z.number().optional().describe("Last position count for change detection"),
        lastCycleTimestamp: z.number().optional().describe("Timestamp of last triggered cycle"),
        nextScheduledCycle: z.number().optional().describe("Timestamp of next scheduled 30min cycle"),
    }),

    key({ id }) {
      return id;
    },

    create: (state) => {
          return {
            instructions:state.args.instructions,
            currentTask: state.args.currentTask,
            lastResult: state.args.lastResult,
            positions:state.args.positions,
            portfolio:state.args.portfolio,
            markets:state.args.markets,
            tokens:state.args.tokens,
            volumes:state.args.volumes,
            orders:state.args.orders,
            trading_history:state.args.trading_history,
            synth_btc_predictions:state.args.synth_btc_predictions,
            synth_eth_predictions:state.args.synth_eth_predictions,
            btc_technical_analysis:state.args.btc_technical_analysis,
            eth_technical_analysis:state.args.eth_technical_analysis,
            // Initialize state tracking
            lastSynthBtcPercentile: state.args.lastSynthBtcPercentile,
            lastSynthEthPercentile: state.args.lastSynthEthPercentile,
            lastPositionCount: state.args.lastPositionCount,
            lastCycleTimestamp: state.args.lastCycleTimestamp,
            nextScheduledCycle: state.args.nextScheduledCycle,
          };
      },

    async loader({ memory }) {
        console.log("🔄 Loading fresh GMX trading data into memory...");
        
        try {
            // Load all data in parallel for maximum speed
            const [
                portfolio,
                positions, 
                markets,
                tokens,
                volumes,
                orders,
                trading_history,
                btc_predictions,
                eth_predictions,
                btc_technical_analysis,
                eth_technical_analysis
            ] = await Promise.all([
                get_portfolio_balance_str(sdk, gmxDataCache),
                get_positions_str(sdk, gmxDataCache),
                get_btc_eth_markets_str(sdk, gmxDataCache),
                get_tokens_data_str(sdk, gmxDataCache),
                get_daily_volumes_str(sdk, gmxDataCache),
                get_orders_str(sdk, gmxDataCache),
                get_trading_history_str(sdk, gmxDataCache),
                get_synth_analysis_str('BTC', gmxDataCache),
                get_synth_analysis_str('ETH', gmxDataCache),
                get_technical_analysis_str(sdk, 'BTC', gmxDataCache),
                get_technical_analysis_str(sdk, 'ETH', gmxDataCache)
            ]);

            // Update memory with fresh data
            memory.portfolio = portfolio;
            memory.positions = positions;
            memory.markets = markets;
            memory.tokens = tokens;
            memory.volumes = volumes;
            memory.orders = orders;
            memory.trading_history = trading_history;
            memory.synth_btc_predictions = btc_predictions;
            memory.synth_eth_predictions = eth_predictions;
            memory.btc_technical_analysis = btc_technical_analysis;
            memory.eth_technical_analysis = eth_technical_analysis;
            
            // Update state tracking for monitoring systems
            const btcPercentile = extractPercentileFromSynthAnalysis(btc_predictions);
            const ethPercentile = extractPercentileFromSynthAnalysis(eth_predictions);
            const positionCount = extractPositionCount(positions);
            
            memory.lastSynthBtcPercentile = btcPercentile;
            memory.lastSynthEthPercentile = ethPercentile;
            memory.lastPositionCount = positionCount;
            
            memory.currentTask = "Data loaded - ready for trading analysis";
            memory.lastResult = `Data refresh completed at ${new Date().toISOString()}`;

            console.log(`✅ GMX trading data loaded successfully! BTC:P${btcPercentile || 'N/A'} ETH:P${ethPercentile || 'N/A'} Positions:${positionCount}`);
        } catch (error) {
            console.error("❌ Error loading GMX data:", error);
            memory.lastResult = `Data loading failed: ${error instanceof Error ? error.message : error}`;
        }
    },

    render({ memory }) {
        console.log("🔄 Rendering GMX trading data...");

        return render(vega_template, {
            instructions: memory.instructions,
            currentTask: memory.currentTask,
            lastResult: memory.lastResult,
            positions: memory.positions,
            portfolio: memory.portfolio,
            markets: memory.markets,
            tokens: memory.tokens,
            volumes: memory.volumes,
            orders: memory.orders,
            trading_history: memory.trading_history,
            synth_btc_predictions: memory.synth_btc_predictions,
            synth_eth_predictions: memory.synth_eth_predictions,
            btc_technical_analysis: memory.btc_technical_analysis,
            eth_technical_analysis: memory.eth_technical_analysis,
            // Include state tracking for event-driven monitoring
            lastSynthBtcPercentile: memory.lastSynthBtcPercentile,
            lastSynthEthPercentile: memory.lastSynthEthPercentile,
            lastPositionCount: memory.lastPositionCount,
            lastCycleTimestamp: memory.lastCycleTimestamp,
            nextScheduledCycle: memory.nextScheduledCycle,
          });
    },
    }).setInputs({
        // 🚨 EVENT MONITOR - Check for Synth signals and position changes every 5 minutes
        "gmx:event-monitor": input({
            schema: z.object({
                text: z.string(),
            }),
            subscribe: (send) => {
                // Track state across monitor runs
                let lastBtcPercentile: number | null = null;
                let lastEthPercentile: number | null = null;
                let lastKnownPositionCount: number | null = null;
                
                const eventMonitor = async () => {
                    try {
                        console.log("🚨 [EVENT] Monitoring Synth signals & position changes...");
                        
                        // Fetch Synth data and positions in parallel
                        const [btc_predictions, eth_predictions, positions] = await Promise.all([
                            get_synth_analysis_str('BTC', gmxDataCache),
                            get_synth_analysis_str('ETH', gmxDataCache),
                            get_positions_str(sdk, gmxDataCache)
                        ]);
                        
                        const btcPercentile = extractPercentileFromSynthAnalysis(btc_predictions);
                        const ethPercentile = extractPercentileFromSynthAnalysis(eth_predictions);
                        const currentPositionCount = extractPositionCount(positions);
                        
                        // Initialize position tracking on first run
                        if (lastKnownPositionCount === null) {
                            lastKnownPositionCount = currentPositionCount;
                            console.log(`🚨 [EVENT] Initialized - BTC:P${btcPercentile || 'N/A'} ETH:P${ethPercentile || 'N/A'} Positions:${currentPositionCount}`);
                            lastBtcPercentile = btcPercentile;
                            lastEthPercentile = ethPercentile;
                            return;
                        }
                        
                        // Check for triggers (priority: position changes > synth signals)
                        let triggered = false;
                        let triggerReason = "";
                        let triggerType = "";
                        
                        // 1. Check for position changes (highest priority)
                        if (currentPositionCount !== lastKnownPositionCount) {
                            const change = currentPositionCount - lastKnownPositionCount;
                            triggerReason = `Position count changed: ${lastKnownPositionCount}→${currentPositionCount} (${change > 0 ? 'new fill' : 'position closed'})`;
                            triggerType = "POSITION";
                            triggered = true;
                        }
                        // 2. Check for Synth threshold breaches
                        else if (btcPercentile !== null && (btcPercentile <= 20 || btcPercentile >= 80)) {
                            triggerReason = `BTC reached P${btcPercentile} (${btcPercentile <= 20 ? 'LONG signal' : 'SHORT signal'})`;
                            triggerType = "SYNTH";
                            triggered = true;
                        }
                        else if (ethPercentile !== null && (ethPercentile <= 20 || ethPercentile >= 80)) {
                            triggerReason = `ETH reached P${ethPercentile} (${ethPercentile <= 20 ? 'LONG signal' : 'SHORT signal'})`;
                            triggerType = "SYNTH";
                            triggered = true;
                        }
                        
                        if (triggered) {
                            await triggerTradingCycle(send, triggerReason, triggerType, {
                                btcPercentile,
                                ethPercentile,
                                positionCount: currentPositionCount
                            });
                            
                            // Update local state after triggering
                            lastBtcPercentile = btcPercentile;
                            lastEthPercentile = ethPercentile;
                            lastKnownPositionCount = currentPositionCount;
                        } else {
                            console.log(`🚨 [EVENT] No triggers - BTC:P${btcPercentile || 'N/A'} ETH:P${ethPercentile || 'N/A'} Positions:${currentPositionCount} (need P≤20/P≥80 or position change)`);
                        }
                        
                    } catch (error) {
                        console.error("❌ [EVENT] Monitoring error:", error);
                    }
                };
                
                // Initial run
                eventMonitor();
                
                const interval = setInterval(eventMonitor, 300000); // 5 minutes
                
                console.warn("✅ Event monitor subscription setup complete");
                return () => {
                    console.warn("🛑 Event monitor subscription cleanup");
                    clearInterval(interval);
                };
            }
        }),
        
        // ⏰ SCHEDULED CYCLE - Fallback 30-minute timer with reset logic
        "gmx:scheduled-cycle": input({
            schema: z.object({
                text: z.string(),
            }),
            subscribe: (send) => {
                let nextScheduledTime = Date.now() + 1800000; // 30 minutes from now
                
                const scheduledCycle = async () => {
                    const now = Date.now();
                    
                    // Only trigger if we've reached the scheduled time
                    if (now >= nextScheduledTime) {
                        console.log("⏰ [SCHEDULED] 30-minute timer triggered - regular trading cycle");
                        
                        await send(gmxContext, {
                            instructions: vega_template,
                            currentTask: "Scheduled Trading Cycle - Regular 30min check",
                            lastResult: `Scheduled cycle at ${new Date().toISOString()}`,
                            positions: "",
                            portfolio: "",
                            markets: "",
                            tokens: "",
                            volumes: "",
                            orders: "",
                            trading_history: "",
                            synth_btc_predictions: "",
                            synth_eth_predictions: "",
                            btc_technical_analysis: "",
                            eth_technical_analysis: "",
                            // Memory state will be refreshed by loader
                            lastSynthBtcPercentile: undefined,
                            lastSynthEthPercentile: undefined,
                            lastPositionCount: undefined,
                            lastCycleTimestamp: now,
                            nextScheduledCycle: now + 1800000,
                        }, {text: "Scheduled 30min cycle"});
                        
                        nextScheduledTime = now + 1800000; // Reset for next 30 minutes
                    }
                };
                
                // Check every minute to see if we should trigger
                const interval = setInterval(scheduledCycle, 60000); // 1 minute checks
                
                console.warn("✅ Scheduled cycle subscription setup complete");
                return () => {
                    console.warn("🛑 Scheduled cycle subscription cleanup");
                    clearInterval(interval);
                };
            }
        })
    });

// Create GMX actions using the SDK instance and enhanced data cache
const gmxActions = createGmxActions(sdk, gmxDataCache);

// ═══════════════════════════════════════════════════════════════════════════════
// 🔌 GMX EXTENSION DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

const gmx = extension({
    name: "gmx",
    contexts: {
        gmxTrading: gmxContext,
    },
    actions: gmxActions,
});

console.warn("⚡ Initializing Vega trading agent...");

 // Initialize complete Supabase memory system
 console.warn("🗄️ Setting up Supabase memory system..." );
 const supabaseMemory = createSupabaseBaseMemory({
     url: env.SUPABASE_URL,
     key: env.SUPABASE_KEY,
     memoryTableName: "gmx_memory",
     vectorTableName: "gmx_embeddings",
     vectorModel: openai("gpt-4o-mini"),
 });

 console.warn("✅ Memory system initialized!");

// Create the agent with persistent memory
const agent = createDreams({
    model: anthropic("claude-sonnet-4-20250514"),
    logger: new Logger({ level: LogLevel.DEBUG }), // Enable debug logging
    extensions: [gmx], // Add GMX extension
    memory: supabaseMemory,
    streaming: false, // Disable streaming to avoid the ... input issue
});

console.warn("✅ Agent created successfully!");

// Start the agent with GMX context arguments
await agent.start({
    instructions: vega_template,
    currentTask: "Starting up - waiting for data load",
    lastResult: "Agent initialized",
    positions: "Loading...",
    portfolio: "Loading...",
    markets: "Loading...",
    tokens: "Loading...",
    volumes: "Loading...",
    orders: "Loading...",
    trading_history: "Loading...",
    synth_btc_predictions: "Loading...",
    synth_eth_predictions: "Loading...",
    btc_technical_analysis: "Loading...",
    eth_technical_analysis: "Loading...",
    // Initialize state tracking
    lastSynthBtcPercentile: undefined,
    lastSynthEthPercentile: undefined,
    lastPositionCount: undefined,
    lastCycleTimestamp: undefined,
    nextScheduledCycle: Date.now() + 1800000, // First scheduled cycle in 30 minutes
});

console.warn("🎯 Vega is now live and ready for GMX trading!");