// Pricing Configuration
// All pricing data centralized for easy management and production deployment

// Base pricing constants (30% cheaper than competitors)
export const PRICING_CONSTANTS = {
  STORAGE_COST_PER_GB: 0.85, // Developer: ₹0.85/GB (was ₹1.20)
  STORAGE_COST_PER_GB_BUSINESS: 0.70, // Business: ₹0.70/GB (was ₹1.00)
  BANDWIDTH_COST_PER_GB: 0.35, // ₹0.35/GB (was ₹0.50)
  API_COST_PER_1K_REQUESTS: 0.18, // ₹0.18/1K requests (was ₹0.25)
  TEAM_MEMBER_COST: 70, // ₹70/user (was ₹100)
  ENVIRONMENT_COST: 105, // ₹105/environment (was ₹150)
  WEBHOOK_COST: 209, // ₹209/month (was ₹299)
  ANALYTICS_COST: 349, // ₹349/month (was ₹499)
  COMPLIANCE_COST: 699, // ₹699/month (was ₹999)
  ADVANCED_SECURITY_COST: 1399, // ₹1399/month (was ₹1999)
  DEDICATED_SUPPORT_COST: 2099, // ₹2099/month (was ₹2999)
  CUSTOM_INTEGRATIONS_COST: 1749, // ₹1749/month (was ₹2499)
};

// Personal Plans
export const PERSONAL_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    storage: 2, // GB
    bandwidth: 10, // GB
    features: [
      '2 GB Storage',
      '10 GB Download Bandwidth',
      'Basic file management',
      'Web dashboard access',
      'Community support'
    ],
    cta: 'Get Started Free',
    popular: false
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '₹49',
    period: 'per month',
    storage: 30, // GB
    bandwidth: 150, // GB
    features: [
      '30 GB Storage',
      '150 GB Download Bandwidth',
      'File versioning',
      'Basic analytics',
      'Email support'
    ],
    cta: 'Start Starter',
    popular: false
  },
  {
    id: 'personal',
    name: 'Personal',
    price: '₹150',
    period: 'per month',
    storage: 150, // GB
    bandwidth: 750, // GB
    features: [
      '150 GB Storage',
      '750 GB Download Bandwidth',
      'Advanced file management',
      'Custom domains',
      'Priority support'
    ],
    cta: 'Start Personal',
    popular: true,
    badge: 'Most Popular'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₹299',
    period: 'per month',
    storage: 400, // GB
    bandwidth: 2000, // GB
    features: [
      '400 GB Storage',
      '2 TB Download Bandwidth',
      'Bulk operations',
      'Advanced analytics',
      'API access',
      'Phone support'
    ],
    cta: 'Start Pro',
    popular: false
  }
];

// Developer Plans
export const DEVELOPER_PLANS = [
  {
    id: 'developer_starter',
    name: 'Developer Starter',
    price: '₹599',
    period: 'per month',
    storage: 500, // GB
    bandwidth: 2500, // GB
    apiRate: 1000, // requests per minute
    features: [
      '500 GB Storage',
      '2.5 TB Download Bandwidth',
      'Full S3 API compatibility',
      'API rate limiting: 1000 req/min',
      'Webhook support',
      'SDK for popular languages',
      'Email support'
    ],
    cta: 'Start Developer',
    popular: false
  },
  {
    id: 'developer_basic',
    name: 'Developer Basic',
    price: '₹899',
    period: 'per month',
    storage: 1000, // GB
    bandwidth: 5000, // GB
    apiRate: 2500,
    features: [
      '1 TB Storage',
      '5 TB Download Bandwidth',
      'Full S3 API compatibility',
      'API rate limiting: 2500 req/min',
      'Advanced webhooks',
      'Multiple environments',
      'Priority email support',
      'Basic analytics'
    ],
    cta: 'Start Developer Basic',
    popular: false
  },
  {
    id: 'developer_pro',
    name: 'Developer Pro',
    price: '₹1,299',
    period: 'per month',
    storage: 2000, // GB
    bandwidth: 10000, // GB
    apiRate: 5000,
    features: [
      '2 TB Storage',
      '10 TB Download Bandwidth',
      'Full S3 API compatibility',
      'API rate limiting: 5000 req/min',
      'Advanced webhooks',
      'Custom endpoints',
      'Priority support',
      'API analytics dashboard'
    ],
    cta: 'Start Developer Pro',
    popular: true,
    badge: 'Most Popular'
  },
  {
    id: 'developer_advanced',
    name: 'Developer Advanced',
    price: '₹1,999',
    period: 'per month',
    storage: 5000, // GB
    bandwidth: 25000, // GB
    apiRate: 10000,
    features: [
      '5 TB Storage',
      '25 TB Download Bandwidth',
      'Full S3 API compatibility',
      'API rate limiting: 10000 req/min',
      'Real-time webhooks',
      'Custom domains',
      'Phone support',
      'Advanced analytics',
      'Multi-region support'
    ],
    cta: 'Start Developer Advanced',
    popular: false
  },
  {
    id: 'developer_enterprise',
    name: 'Developer Enterprise',
    price: 'Custom',
    period: 'pricing',
    storage: Infinity,
    bandwidth: Infinity,
    apiRate: Infinity,
    features: [
      'Unlimited Storage',
      'Unlimited Bandwidth',
      'Dedicated API endpoints',
      'No rate limiting',
      'Custom integrations',
      'White-label options',
      '24/7 dedicated support',
      'SLA guarantees'
    ],
    cta: 'Contact Sales',
    popular: false
  }
];

// Business Plans
export const BUSINESS_PLANS = [
  {
    id: 'business_starter',
    name: 'Business Starter',
    price: '₹1,499',
    period: 'per month',
    storage: 1000, // GB
    bandwidth: 5000, // GB
    teamMembers: 5,
    features: [
      '1 TB Storage',
      '5 TB Download Bandwidth',
      'Up to 5 team members',
      'Basic team management',
      'Standard analytics',
      'Email support',
      'Basic compliance reports',
      'Custom domains'
    ],
    cta: 'Start Business Starter',
    popular: false
  },
  {
    id: 'business_pro',
    name: 'Business Pro',
    price: '₹2,999',
    period: 'per month',
    storage: 5000, // GB
    bandwidth: 25000, // GB
    teamMembers: 25,
    features: [
      '5 TB Storage',
      '25 TB Download Bandwidth',
      'Up to 25 team members',
      'Advanced team management',
      'Role-based permissions',
      'Advanced analytics',
      'Priority email support',
      'Compliance dashboard',
      'API access included'
    ],
    cta: 'Start Business Pro',
    popular: true,
    badge: 'Most Popular'
  },
  {
    id: 'business_advanced',
    name: 'Business Advanced',
    price: '₹5,999',
    period: 'per month',
    storage: 15000, // GB
    bandwidth: 75000, // GB
    teamMembers: 100,
    features: [
      '15 TB Storage',
      '75 TB Download Bandwidth',
      'Up to 100 team members',
      'Advanced security controls',
      'Audit logs & compliance',
      'Custom integrations',
      'Phone support',
      'Dedicated account manager',
      'SLA guarantees'
    ],
    cta: 'Start Business Advanced',
    popular: false
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '₹12,999',
    period: 'per month',
    storage: 50000, // GB
    bandwidth: 250000, // GB
    teamMembers: Infinity,
    features: [
      '50 TB Storage',
      '250 TB Download Bandwidth',
      'Unlimited team members',
      'White-label solutions',
      'Custom compliance reports',
      'Dedicated infrastructure',
      'On-premise deployment',
      '24/7 dedicated support',
      'Custom SLA'
    ],
    cta: 'Contact Enterprise Sales',
    popular: false
  },
  {
    id: 'custom_enterprise',
    name: 'Custom Enterprise',
    price: 'Custom',
    period: 'pricing',
    storage: Infinity,
    bandwidth: Infinity,
    teamMembers: Infinity,
    features: [
      'Unlimited Storage',
      'Unlimited Bandwidth',
      'Unlimited team members',
      'Custom feature development',
      'Dedicated data centers',
      'Custom compliance frameworks',
      'White-label platform',
      'Dedicated engineering team',
      'Custom contracts & SLA'
    ],
    cta: 'Contact Custom Sales',
    popular: false
  }
];

// Industry Comparison Data
export const INDUSTRY_COMPARISONS = {
  developer: [
    {
      metric: 'API Response Time',
      industry: '200-500ms average',
      nexus: 'Sub-100ms guaranteed',
      improvement: '2-5x faster'
    },
    {
      metric: 'Storage Cost (India)',
      industry: '₹1.20/GB (Competitors)',
      nexus: '₹0.85/GB equivalent',
      improvement: '30% cheaper'
    },
    {
      metric: 'Egress Cost (India)',
      industry: '₹0.50/GB (Competitors)',
      nexus: '₹0.35/GB',
      improvement: '30% cheaper'
    },
    {
      metric: 'API Setup Time',
      industry: '2-3 days configuration',
      nexus: '5 minutes setup',
      improvement: '99% faster'
    }
  ],
  business: [
    {
      metric: 'Team Collaboration',
      industry: '₹150/user (Competitors)',
      nexus: '₹70/user equivalent',
      improvement: '30% cheaper'
    },
    {
      metric: 'Storage Cost (India)',
      industry: '₹1.00/GB (Competitors)',
      nexus: '₹0.70/GB equivalent',
      improvement: '30% cheaper'
    },
    {
      metric: 'Egress Cost (India)',
      industry: '₹0.50/GB (Competitors)',
      nexus: '₹0.35/GB',
      improvement: '30% cheaper'
    },
    {
      metric: 'Compliance Features',
      industry: '₹999/month (Competitors)',
      nexus: '₹699/month',
      improvement: '30% cheaper'
    }
  ]
};

// Calculator Functions
export const calculateDeveloperCost = (
  storageGB: number,
  bandwidthGB: number,
  apiRequestsPerMin: number,
  environments: number,
  needsWebhooks: boolean,
  needsAnalytics: boolean
) => {
  const storageCost = storageGB * PRICING_CONSTANTS.STORAGE_COST_PER_GB;
  const bandwidthCost = bandwidthGB * PRICING_CONSTANTS.BANDWIDTH_COST_PER_GB;
  const apiCost = (apiRequestsPerMin * 60 * 24 * 30 / 1000) * PRICING_CONSTANTS.API_COST_PER_1K_REQUESTS;
  const environmentCost = Math.max(0, environments - 1) * PRICING_CONSTANTS.ENVIRONMENT_COST;
  const webhookCost = needsWebhooks ? PRICING_CONSTANTS.WEBHOOK_COST : 0;
  const analyticsCost = needsAnalytics ? PRICING_CONSTANTS.ANALYTICS_COST : 0;
  
  return storageCost + bandwidthCost + apiCost + environmentCost + webhookCost + analyticsCost;
};

export const calculateBusinessCost = (
  storageGB: number,
  bandwidthGB: number,
  teamMembers: number,
  needsCompliance: boolean,
  needsAdvancedSecurity: boolean,
  needsDedicatedSupport: boolean,
  needsCustomIntegrations: boolean
) => {
  const storageCost = storageGB * PRICING_CONSTANTS.STORAGE_COST_PER_GB_BUSINESS;
  const bandwidthCost = bandwidthGB * PRICING_CONSTANTS.BANDWIDTH_COST_PER_GB;
  const teamCost = Math.max(0, teamMembers - 5) * PRICING_CONSTANTS.TEAM_MEMBER_COST;
  const complianceCost = needsCompliance ? PRICING_CONSTANTS.COMPLIANCE_COST : 0;
  const securityCost = needsAdvancedSecurity ? PRICING_CONSTANTS.ADVANCED_SECURITY_COST : 0;
  const supportCost = needsDedicatedSupport ? PRICING_CONSTANTS.DEDICATED_SUPPORT_COST : 0;
  const integrationsCost = needsCustomIntegrations ? PRICING_CONSTANTS.CUSTOM_INTEGRATIONS_COST : 0;
  
  return storageCost + bandwidthCost + teamCost + complianceCost + securityCost + supportCost + integrationsCost;
};

export const findBestDeveloperPlan = (
  storageGB: number,
  bandwidthGB: number,
  apiRequestsPerMin: number
) => {
  for (const plan of DEVELOPER_PLANS) {
    if (plan.storage >= storageGB && 
        plan.bandwidth >= bandwidthGB && 
        (plan.apiRate >= apiRequestsPerMin || plan.apiRate === Infinity) &&
        plan.price !== 'Custom') {
      return plan;
    }
  }
  return DEVELOPER_PLANS[DEVELOPER_PLANS.length - 1]; // Return enterprise plan
};

export const findBestBusinessPlan = (
  storageGB: number,
  bandwidthGB: number,
  teamMembers: number
) => {
  for (const plan of BUSINESS_PLANS) {
    if (plan.storage >= storageGB && 
        plan.bandwidth >= bandwidthGB && 
        (plan.teamMembers >= teamMembers || plan.teamMembers === Infinity) &&
        plan.price !== 'Custom') {
      return plan;
    }
  }
  return BUSINESS_PLANS[BUSINESS_PLANS.length - 1]; // Return custom enterprise plan
};