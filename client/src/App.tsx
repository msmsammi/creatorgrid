import { Route, Switch, useLocation } from "wouter";
import { CreatorGridProvider, useCreatorGrid } from "@/contexts/CreatorGridContext";
import { LandingPage, PricingPage } from "@/pages/Marketing";
import { ForgotPasswordPage, PrivacyPage, SignInPage, SignUpPage } from "@/pages/AuthPages";
import { WorkspaceApp } from "@/pages/WorkspaceApp";
import { useEffect } from "react";

function ProtectedWorkspace(){const {user,loading}=useCreatorGrid();const [,navigate]=useLocation();useEffect(()=>{if(!loading&&!user)navigate("/sign-in");},[loading,user,navigate]);if(loading)return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",color:"#8a8981"}}>Opening your studio…</div>;if(!user)return null;return <WorkspaceApp/>;}
function Router(){return <Switch><Route path="/" component={LandingPage}/><Route path="/pricing" component={PricingPage}/><Route path="/sign-in" component={SignInPage}/><Route path="/sign-up" component={SignUpPage}/><Route path="/forgot-password" component={ForgotPasswordPage}/><Route path="/privacy" component={PrivacyPage}/><Route path="/dashboard" component={ProtectedWorkspace}/><Route path="/calendar" component={ProtectedWorkspace}/><Route path="/board" component={ProtectedWorkspace}/><Route path="/library" component={ProtectedWorkspace}/><Route path="/content/:id" component={ProtectedWorkspace}/><Route path="/assets" component={ProtectedWorkspace}/><Route path="/approvals" component={ProtectedWorkspace}/><Route path="/performance" component={ProtectedWorkspace}/><Route path="/settings" component={ProtectedWorkspace}/><Route component={LandingPage}/></Switch>}
export default function App(){return <CreatorGridProvider><Router/></CreatorGridProvider>}
