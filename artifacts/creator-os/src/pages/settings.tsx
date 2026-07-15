import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SiInstagram, SiYoutube, SiTiktok } from "react-icons/si";
import { Linkedin } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, connections, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent justify-start p-0 mb-6">
          <TabsTrigger value="profile" className="data-[state=active]:bg-card border border-transparent data-[state=active]:border-border rounded-md px-4 py-2">Profile</TabsTrigger>
          <TabsTrigger value="platforms" className="data-[state=active]:bg-card border border-transparent data-[state=active]:border-border rounded-md px-4 py-2">Connected Platforms</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-card border border-transparent data-[state=active]:border-border rounded-md px-4 py-2">Notifications</TabsTrigger>
          <TabsTrigger value="subscription" className="data-[state=active]:bg-card border border-transparent data-[state=active]:border-border rounded-md px-4 py-2">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="Jane Doe" className="bg-secondary/50 border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" defaultValue="jane@example.com" className="bg-secondary/50 border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Creator Bio / Niche</Label>
                <Input id="bio" defaultValue="Tech Educator & Developer" className="bg-secondary/50 border-border" />
              </div>
              <Button className="mt-4">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Integrations</CardTitle>
              <CardDescription>Connect your accounts to enable AI analytics.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {[
                { name: "Instagram", icon: SiInstagram, connected: true, username: "@janedoe" },
                { name: "YouTube", icon: SiYoutube, connected: true, username: "Jane Doe Tech" },
                { name: "TikTok", icon: SiTiktok, connected: false },
                { name: "LinkedIn", icon: Linkedin, connected: true, username: "jane-doe" }
              ].map((platform) => (
                <div key={platform.name} className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/20">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-card border border-border flex items-center justify-center">
                      <platform.icon size={20} className={platform.connected ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{platform.name}</h4>
                      {platform.connected ? (
                        <p className="text-xs text-muted-foreground">{platform.username}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Not connected</p>
                      )}
                    </div>
                  </div>
                  <Button variant={platform.connected ? "outline" : "default"} size="sm">
                    {platform.connected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Control when and how AI agents notify you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Email Notifications</h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Weekly Growth Report</Label>
                    <p className="text-sm text-muted-foreground">Receive your AI-generated summary every Monday.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Viral Trend Alerts</Label>
                    <p className="text-sm text-muted-foreground">Instant emails when a relevant trend spikes.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Competitor Activity</Label>
                    <p className="text-sm text-muted-foreground">When tracked accounts post breakout content.</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Card className="border-primary/50 bg-primary/5 relative overflow-hidden">
            <CardHeader>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground w-fit mb-2">Pro Plan</div>
              <CardTitle>Subscription Overview</CardTitle>
              <CardDescription className="text-foreground/80">You are currently on the Pro tier.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-muted-foreground pb-1">/ month</span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Next billing date</span>
                  <span className="font-medium">Oct 1, 2024</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment method</span>
                  <span className="font-medium">Visa ending in 4242</span>
                </div>
              </div>
              <div className="flex gap-4">
                <Button className="bg-primary hover:bg-primary/90">Manage Subscription</Button>
                <Button variant="outline">View Invoices</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}