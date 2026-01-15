import { AuthFormData } from "@/types/AuthFormData";
import { View } from "@/types/View";
import { Dispatch, SetStateAction } from "react";

export interface AuthPageProps {
  onAuthSuccess: () => void;
  initialMode?: 'login' | 'signup';
  onNavigate?: (view: View) => void;
  formData: AuthFormData;
  setFormData: Dispatch<SetStateAction<AuthFormData>>;
}