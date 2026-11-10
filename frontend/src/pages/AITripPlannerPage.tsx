/**
 * AITripPlannerPage.tsx
 *
 * Renders the AI Trip Planner with exact Layout (Sidebar + Top Navbar + Heritage Animated Background)
 * from AI-TripPlanner-main.
 */

import Layout from '@/components/layout/Layout';
// @ts-ignore
import TripPlanner from '@/pages/TripPlanner';

export default function AITripPlannerPage() {
  return (
    <Layout showSidebar>
      <TripPlanner />
    </Layout>
  );
}
