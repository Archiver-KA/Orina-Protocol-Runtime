import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { IntroductionPage } from "./pages/IntroductionPage";
import { GettingStartedPage } from "./pages/GettingStartedPage";
import { BuyerGuidePage } from "./pages/BuyerGuidePage";
import { SellerGuidePage } from "./pages/SellerGuidePage";
import { FAQPage } from "./pages/FAQPage";
import { AppArchitecturePage } from "./pages/AppArchitecturePage";
import { TermsOfUsePage } from "./pages/TermsOfUsePage";
import { ProductListingPolicyPage } from "./pages/ProductListingPolicyPage";
import { PrivacyPolicyPage } from "./pages/PrivacyPolicyPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: IntroductionPage },
      { path: "getting-started", Component: GettingStartedPage },
      { path: "buyer-guide", Component: BuyerGuidePage },
      { path: "seller-guide", Component: SellerGuidePage },
      { path: "faq", Component: FAQPage },
      { path: "app-architecture", Component: AppArchitecturePage },
      { path: "terms", Component: TermsOfUsePage },
      { path: "listing-policy", Component: ProductListingPolicyPage },
      { path: "privacy", Component: PrivacyPolicyPage },
    ],
  },
]);