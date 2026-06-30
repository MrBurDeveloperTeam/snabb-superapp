import { Control, FieldErrors } from "react-hook-form";
import { AuthFormInputs } from "./AuthFormInputs";

interface Props {
  control: Control<AuthFormInputs>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error: FieldErrors<AuthFormInputs>;
  showTermsError: boolean;
  isOtherMode: boolean;
  tempOtherValue: string;
  onLegalClick: (e: React.MouseEvent, view: string) => void;
}