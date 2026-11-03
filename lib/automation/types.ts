export type AutomationCondition =
  | { type: "always" }
  | { type: "phone_contains"; value: string };

export type AutomationAction =
  | { type: "create_task"; title: string }
  | { type: "log_only"; message: string };

export type Automation = {
  id: string;
  name: string;
  event: "manual_test" | "campaign_demo_completed";
  condition: AutomationCondition;
  action: AutomationAction;
  enabled: boolean;
  createdAt: string;
};

export type AutomationContext = {
  phone: string;
  campaignName: string;
  event: Automation["event"];
};

export type DemoTask = {
  id: string;
  title: string;
  phone: string;
  campaignName: string;
  source: "automation_demo";
  createdAt: string;
};

export type AutomationRun = {
  id: string;
  automationId: string;
  automationName: string;
  status: "executed" | "skipped" | "failed";
  message: string;
  context: AutomationContext;
  createdAt: string;
};