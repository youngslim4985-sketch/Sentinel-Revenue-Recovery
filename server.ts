import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import Stripe from "stripe";

// Verify Stripe configuration during startup
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ CRITICAL: STRIPE_SECRET_KEY is missing from the secret stash.");
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

async function startServer() {
  console.log("Starting Lead-Capture Engine server...");
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Use a custom JSON parser that preserves the raw body for Stripe signature verification
  app.use(express.json({
    verify: (req: any, res, buf) => {
      if (req.originalUrl.startsWith('/api/webhook/stripe')) {
        req.rawBody = buf;
      }
    }
  }));

  // WebSocket Broadcast Helper
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection established");
    ws.send(JSON.stringify({ type: "connection_established", message: "Connected to Sentinel Real-time Hub" }));
  });

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // In-memory store for the demo
  const leads: any[] = [];
  const clients: any = {
    "security": {
      id: "security",
      name: "Sentinel Solutions",
      ai_persona: "You are a professional concierge for a high-end security firm. Your tone is reassuring, expert, and efficient.",
      industry: "Security",
      status: "active",
      stripe_status: "active",
      is_onboarded: true,
      lead_limit: 500,
      revenue_to_date: 0,
      activated_at: new Date().toISOString()
    },
    "GROUP_ID_PRO_1": {
      id: "GROUP_ID_PRO_1",
      name: "Pro Sentinel Node",
      ai_persona: "You are an elite lead capture agent for a premium enterprise service. You are highly professional, data-driven, and focused on high-value conversions.",
      industry: "Enterprise",
      status: "active",
      stripe_status: "active",
      is_onboarded: true,
      lead_limit: 5000,
      revenue_to_date: 12450,
      activated_at: new Date().toISOString()
    },
    "realestate": {
      id: "realestate",
      name: "Elite Estates",
      ai_persona: "You are a friendly and knowledgeable real estate assistant. Your tone is welcoming, aspirational, and helpful.",
      industry: "Real Estate",
      status: "pending",
      stripe_status: "pending",
      is_onboarded: false,
      lead_limit: 500,
      revenue_to_date: 0
    },
    "dental": {
      id: "dental",
      name: "Smile Bright Dental",
      ai_persona: "You are a caring and organized dental office assistant. Your tone is gentle, professional, and encouraging.",
      industry: "Healthcare",
      status: "pending",
      stripe_status: "pending",
      is_onboarded: false,
      lead_limit: 500,
      revenue_to_date: 0
    }
  };

  let activeClientId = "security";

  // Mock Email Notification
  const sendLeadNotification = (lead: any) => {
    console.log(`[MOCK EMAIL] To: business-owner@${activeClientId}.com`);
    console.log(`[MOCK EMAIL] Subject: NEW LEAD CAPTURED: ${lead.name || "Anonymous"}`);
    console.log(`[MOCK EMAIL] Body: A new lead was captured via the Sentinel Widget.\nName: ${lead.name}\nPhone: ${lead.phone}\nMessage: ${lead.lastMessage}`);
  };

  // AI Router Endpoint
  app.post("/api/ai-lead-concierge", async (req, res) => {
    const { text, clientId, conversationId } = req.body;
    const config = clients[clientId || activeClientId] || clients["security"];

    // Check if client is active
    if (config.status !== "active") {
      return res.json({ 
        reply: `[SYSTEM] Service for ${config.name} is currently pending activation. Please complete the setup fee payment to enable AI concierge services.`,
        status: "inactive"
      });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const prompt = `${config.ai_persona}. Your goal is to collect their Phone and Name. Be concise. 
      User message: ${text}
      
      If the user provides a name and phone number, respond politely and confirm you've received it.
      If they haven't, steer the conversation to get those details.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const aiResponse = result.text || "I'm sorry, I couldn't process that.";

      // Mock "Lead Detection" logic
      const leadInfo = {
        name: text.match(/my name is ([a-zA-Z\s]+)/i)?.[1] || text.match(/i am ([a-zA-Z\s]+)/i)?.[1] || null,
        phone: text.match(/(\d{3}[-\.\s]??\d{3}[-\.\s]??\d{4}|\(\d{3}\)\s*\d{3}[-\.\s]??\d{4}|\d{10})/)?.[0] || null,
      };

      if (leadInfo.name || leadInfo.phone) {
        const regions = ["REGION_NORTH_WEST", "REGION_EUROPE", "REGION_APAC"];
        const randomRegion = regions[Math.floor(Math.random() * regions.length)];
        
        const newLead = {
          id: Math.random().toString(36).substr(2, 9),
          clientId: config.id,
          groupId: randomRegion, // For regional node demo
          ...leadInfo,
          lastMessage: text,
          timestamp: new Date().toISOString(),
        };
        leads.push(newLead);
        sendLeadNotification(newLead);
        broadcast({ type: "new_lead", lead: newLead });
      }

      res.json({ reply: aiResponse });
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to process AI request" });
    }
  });

  // Client Config Endpoint
  app.get("/api/clients", (req, res) => {
    res.json(Object.values(clients));
  });

  app.post("/api/set-active-client", (req, res) => {
    activeClientId = req.body.clientId;
    res.json({ success: true, activeClient: clients[activeClientId] });
  });

  // Create Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    const { clientId } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.APP_URL || `http://localhost:3000`;

    if (!stripeKey) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    const stripe = new Stripe(stripeKey);

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Sentinel AI Setup & Integration",
                description: "One-time setup fee for Lead Sentinel AI Concierge",
              },
              unit_amount: 250000, // $2,500.00
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Lead Recovery Service - Monthly Retainer",
                description: "Priority 24/7 AI hosting and real-time routing",
              },
              unit_amount: 60000, // $600.00
            },
            quantity: 1,
          },
        ],
        mode: "payment", // Using 'payment' for the one-time + first month combo
        success_url: `${appUrl}?view=demo&status=success`,
        cancel_url: `${appUrl}?view=demo&status=cancel`,
        metadata: {
          clientId: clientId,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe Session Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe Billing Portal Session
  app.post("/api/create-portal-session", async (req, res) => {
    const { clientId } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.APP_URL || `http://localhost:3000`;

    if (!stripeKey) {
      return res.status(500).json({ error: "Stripe is not configured on the server." });
    }

    const stripe = new Stripe(stripeKey);

    try {
      const client = clients[clientId];
      if (!client || !client.customer_id) {
        return res.status(400).json({ error: "No active subscription or customer found for this client." });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: client.customer_id,
        return_url: `${appUrl}?view=demo`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      console.error("Stripe Portal Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/active-client", (req, res) => {
    res.json(clients[activeClientId]);
  });

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Dashboard Endpoint
  app.get("/api/leads", (req, res) => {
    const { groupId, sortBy, order } = req.query;
    console.log(`Serving leads. Filters: groupId=${groupId}, sortBy=${sortBy}, order=${order}`);
    
    let filteredLeads = [...leads];

    // Filter by groupId or clientId
    if (groupId) {
      filteredLeads = filteredLeads.filter(l => l.clientId === groupId || l.groupId === groupId);
    }

    // Sort by timestamp (default: desc)
    const sortOrder = order === "asc" ? 1 : -1;
    filteredLeads.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return (timeA - timeB) * sortOrder;
    });

    res.json(filteredLeads);
  });

  // Stripe Webhook Handler
  app.post("/api/webhook/stripe", async (req: any, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY is missing");
      return res.status(500).send("Server configuration error");
    }

    const stripe = new Stripe(stripeKey);

    let event;

    try {
      const body = req.rawBody || req.body;
      if (webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } else {
        // Fallback for local testing without signature verification if secret is missing
        event = typeof body === 'string' ? JSON.parse(body) : body;
        console.warn("⚠️ Webhook signature verification skipped (STRIPE_WEBHOOK_SECRET missing)");
      }
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const clientId = session.metadata?.clientId;

      if (clientId && clients[clientId]) {
        // Money in the Bank Logic
        clients[clientId].status = "active";
        clients[clientId].stripe_status = "active";
        clients[clientId].customer_id = session.customer;
        clients[clientId].subscription_id = session.subscription || null;
        clients[clientId].activated_at = new Date().toISOString();
        clients[clientId].is_onboarded = false; // Triggers "Welcome" flow
        clients[clientId].lead_limit = 500;     // Set cap for $600/mo tier
        clients[clientId].revenue_to_date = (clients[clientId].revenue_to_date || 0) + (session.amount_total / 100);

        console.log(`🚀 Sentinel Node Activated: ${clientId}`);
        console.log(`✅ Client ${clientId} activated successfully! Revenue: $${clients[clientId].revenue_to_date}`);
        broadcast({ type: "client_activated", clientId, revenue: clients[clientId].revenue_to_date });
      }
    }

    res.json({ received: true });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> SENTINEL SERVER ACTIVE ON PORT ${PORT} <<<`);
    console.log(`>>> API Endpoints: /api/leads, /api/clients, /api/ai-lead-concierge <<<`);
    console.log(`>>> WebSocket Hub: ws://localhost:${PORT} <<<`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server failed to start:", err);
});
