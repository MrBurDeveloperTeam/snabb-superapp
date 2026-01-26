import { UseFormSetValue } from "react-hook-form";
import { LoginFormInputs } from "../types/LoginPageProps";
import { ChangeEvent } from "react";
import { SignupFormInputs } from "../types/SignUpFormInputs";

export const handleInputChangeLogin = <T extends Record<string, any>>(
    e: ChangeEvent<HTMLInputElement>,
    setValue: UseFormSetValue<T>) => {
    const { name, value } = e.target;

    switch (name) {
      case "email":
        console.log("Email changed:",name, value);
        // setValue("email", value.toLowerCase());
        break;
      case "password":
        console.log("Password changed:", value);
        // Example: validate password strength here if you want
        break;
      default:
        console.log("Other input changed:", name, value);
    }
};

export const handleInputChangeSignup = (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: UseFormSetValue<SignupFormInputs>) => {
      const { name, value } = e.target;
      switch (name) {
      case "fullName":
        // setValue("fullName", value.toLowerCase());
        break;
      case "email":
        // Example: validate password strength here if you want
        break;
      case "jobPosition":
        // Example: validate password strength here if you want
        break;
      case "customJobPosition":
        // Example: validate password strength here if you want
        break;
      case "phone":
        // Example: validate password strength here if you want
        break;
      case "password":
        // Example: validate password strength here if you want
        break;
      case "confirmPassword":
        // Example: validate password strength here if you want
        break;
      case "agreedToTerms":
        // Example: validate password strength here if you want
        break;
      default:
    }

    }

