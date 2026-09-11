import { ChangeEvent } from "react";
import { UseFormSetValue } from "react-hook-form";
import { AuthFormInputs } from "../types/AuthFormInputs";

export const handleInputChangeLogin = <
  T extends Record<string, any>
>(
  e: ChangeEvent<HTMLInputElement>,
  _setValue: UseFormSetValue<T>
) => {
  const { name, value } = e.target;

  switch (name) {
    case "login":
      break;
    case "password":
      break;
    default:
      console.log("Other input changed:", name, value);
  }
};

export const handleInputChangeSignup = (
  e: ChangeEvent<
    HTMLInputElement | HTMLSelectElement
  >,
  _setValue: UseFormSetValue<AuthFormInputs>
) => {
  const { name } = e.target;

  switch (name) {
    case "firstName":
    case "lastName":
    case "email":
    case "jobPosition":
    case "customJobPosition":
    case "phone":
    case "password":
    case "confirmPassword":
    case "agreedToTerms":
      break;
    default:
      break;
  }
};