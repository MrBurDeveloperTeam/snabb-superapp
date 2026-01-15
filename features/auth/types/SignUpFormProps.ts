import { Control, FieldErrors } from "react-hook-form";
import { SignupFormInputs } from "./SignUpFormInputs";

interface Props {
  control: Control<SignupFormInputs>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error: FieldErrors<SignupFormInputs>;
  showTermsError: boolean;
  isOtherMode: boolean;
  tempOtherValue: string;
  onLegalClick: (e: React.MouseEvent, view: string) => void;
}