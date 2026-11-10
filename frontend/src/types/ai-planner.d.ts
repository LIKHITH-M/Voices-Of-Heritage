declare module '@/contexts/NotificationContext' {
  export const NotificationProvider: any;
  export const useNotifications: () => any;
}

declare module '@/components/layout/Layout' {
  const Layout: any;
  export default Layout;
}

declare module '@/pages/TripPlanner' {
  const TripPlanner: any;
  export default TripPlanner;
}

declare module '@/pages/Trips' {
  const Trips: any;
  export default Trips;
}

declare module '@/pages/TripDetail' {
  const TripDetail: any;
  export default TripDetail;
}

declare module '@/pages/AiMaps' {
  const AiMaps: any;
  export default AiMaps;
}

declare module '@/pages/AiDashboard' {
  const AiDashboard: any;
  export default AiDashboard;
}

declare module '@/components/ui' {
  export const Button: any;
  export const Input: any;
  export const Card: any;
  export const Modal: any;
  export const LoadingSpinner: any;
  export const Badge: any;
}

