import { Link } from "wouter";
import { BrainCircuit, Activity, LineChart, Target, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="container mx-auto px-4 h-20 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <BrainCircuit size={20} />
          </div>
          CreatorOS AI
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#agents" className="hover:text-foreground transition-colors">AI Agents</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors hidden sm:block">
            Log in
          </Link>
          <Link href="/register">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Start Growing
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
          <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs font-medium text-primary mb-6">
                <Zap size={14} className="fill-primary" />
                Meet your new AI Growth Strategist
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-tight">
                Stop guessing. <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
                  Start scaling.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                CreatorOS AI is the cockpit for your creator business. Deep analytics, competitor intelligence, and specialized AI agents that build your strategy.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90">
                    Start Growing Now
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-primary/20 hover:bg-primary/10">
                  View Live Demo
                </Button>
              </div>
            </motion.div>
            
            {/* Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-20 relative mx-auto"
            >
              <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-2 shadow-2xl overflow-hidden">
                <div className="rounded-lg border border-border/50 overflow-hidden bg-background">
                  <div className="h-8 bg-secondary flex items-center px-4 gap-2 border-b border-border/50">
                    <div className="w-3 h-3 rounded-full bg-destructive/80"></div>
                    <div className="w-3 h-3 rounded-full bg-accent/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <div className="aspect-[16/9] bg-card p-6 flex flex-col gap-4">
                    {/* Mock dashboard content */}
                    <div className="flex gap-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex-1 h-24 rounded-md border border-border/50 bg-secondary/20 flex flex-col justify-center px-4">
                          <div className="w-16 h-3 bg-muted rounded mb-2"></div>
                          <div className="w-24 h-6 bg-foreground/20 rounded"></div>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 flex gap-4">
                      <div className="flex-[2] rounded-md border border-border/50 bg-secondary/10 relative overflow-hidden p-4">
                        <div className="w-32 h-4 bg-muted rounded mb-6"></div>
                        <svg viewBox="0 0 100 50" className="w-full h-full stroke-primary opacity-50 overflow-visible" preserveAspectRatio="none">
                          <path d="M0,40 Q20,30 40,35 T80,20 T100,5" fill="none" strokeWidth="2" strokeLinecap="round" />
                          <path d="M0,45 Q30,40 50,25 T90,15 T100,10" fill="none" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex-1 rounded-md border border-accent/20 bg-accent/5 p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                          <BrainCircuit className="text-accent h-5 w-5" />
                          <div className="w-24 h-4 bg-accent/40 rounded"></div>
                        </div>
                        <div className="space-y-3">
                          <div className="w-full h-2 bg-muted rounded"></div>
                          <div className="w-5/6 h-2 bg-muted rounded"></div>
                          <div className="w-4/6 h-2 bg-muted rounded"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/10 via-transparent to-accent/10 blur-2xl -z-10"></div>
            </motion.div>
          </div>
        </section>

        {/* AI Agents Section */}
        <section id="agents" className="py-24 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Your personal team of AI specialists</h2>
              <p className="text-muted-foreground text-lg">
                CreatorOS AI isn't just a dashboard. It's a team of specialized agents working 24/7 to analyze your data and build your strategy.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { title: "Growth Analyst", icon: Activity, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", desc: "Monitors your metrics, finds anomalies, and tells you exactly what's working and what's not." },
                { title: "Content Strategist", icon: Target, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", desc: "Analyzes your best hooks and formats to suggest new content ideas with high viral potential." },
                { title: "Competitor Intel", icon: LineChart, color: "text-accent", bg: "bg-accent/10", border: "border-accent/20", desc: "Tracks your rivals, decodes their strategy, and alerts you when they post a breakout hit." }
              ].map((agent, i) => (
                <div key={i} className={`p-6 rounded-xl border ${agent.border} bg-card hover:shadow-lg transition-all`}>
                  <div className={`w-12 h-12 rounded-lg ${agent.bg} flex items-center justify-center mb-6`}>
                    <agent.icon className={`h-6 w-6 ${agent.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{agent.title}</h3>
                  <p className="text-muted-foreground">{agent.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features list */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Stop staring at spreadsheets. Get actionable insights.</h2>
                <div className="space-y-6">
                  {[
                    "Multi-platform analytics unified in one dashboard",
                    "AI-generated weekly growth reports and action plans",
                    "Content idea generation based on your unique audience data",
                    "Trend detection before they peak"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="mt-1 flex-shrink-0">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-lg text-muted-foreground">{feature}</p>
                    </div>
                  ))}
                </div>
                <Button className="mt-8 gap-2 group">
                  Explore Features <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-2xl border border-border bg-card p-8 flex flex-col shadow-2xl relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="font-bold text-xl">Weekly Growth Plan</h4>
                    <span className="text-accent text-sm font-mono bg-accent/10 px-2 py-1 rounded">AI Generated</span>
                  </div>
                  <div className="space-y-4 flex-1">
                    {[
                      { day: "Monday", task: "Post long-form video on YouTube", type: "Pillar Content" },
                      { day: "Wednesday", task: "Extract 3 clips for TikTok/Reels", type: "Repurpose" },
                      { day: "Friday", task: "Share key takeaways on LinkedIn", type: "Text Format" }
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-lg border border-border bg-secondary/50 flex gap-4">
                        <div className="w-16 text-sm font-medium text-muted-foreground shrink-0">{item.day}</div>
                        <div>
                          <p className="font-medium mb-1">{item.task}</p>
                          <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{item.type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] -z-10 rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-secondary/30 border-t border-border/50">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Pricing for serious creators</h2>
              <p className="text-muted-foreground text-lg">Invest in the tools that actually drive growth.</p>
            </div>
            
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { name: "Free", price: "$0", desc: "Basic tracking for starting creators", features: ["1 Platform", "7-day history", "Basic analytics"] },
                { name: "Creator", price: "$19", desc: "Essential tools for growing accounts", features: ["3 Platforms", "30-day history", "Content ideas", "Weekly reports"] },
                { name: "Pro", price: "$49", desc: "Advanced AI for professional creators", features: ["All Platforms", "Unlimited history", "Full AI Agents", "Competitor tracking"], pop: true },
                { name: "Agency", price: "$129", desc: "Multi-account management", features: ["10 accounts", "White-label reports", "API access", "Priority support"] }
              ].map((plan, i) => (
                <div key={i} className={`p-6 rounded-xl border ${plan.pop ? 'border-primary bg-card relative shadow-[0_0_30px_rgba(99,102,241,0.15)]' : 'border-border bg-card'}`}>
                  {plan.pop && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Most Popular</div>}
                  <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 h-10">{plan.desc}</p>
                  <Button className={`w-full mb-6 ${plan.pop ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}>
                    Choose {plan.name}
                  </Button>
                  <ul className="space-y-3 text-sm">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary/70 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t border-border bg-card text-center text-muted-foreground text-sm">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-foreground font-bold">
            <BrainCircuit size={16} className="text-primary" />
            CreatorOS AI
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Product</a>
            <a href="#" className="hover:text-foreground">Resources</a>
            <a href="#" className="hover:text-foreground">Company</a>
            <a href="#" className="hover:text-foreground">Terms</a>
          </div>
          <p>© 2024 CreatorOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}