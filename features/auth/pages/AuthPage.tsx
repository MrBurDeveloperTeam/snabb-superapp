import LoginForm from './LoginForm.tsx';
import Showcase from './ShowCase.tsx';
import { Dispatch, SetStateAction, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { LoginFormInputs } from '../types/LoginPageProps.ts';
import { Box, Portal } from '@mui/material';
import { SubmitButton } from '@/shared/ui/SubmitButton.tsx';
import { handleInputChangeLogin, handleInputChangeSignup } from '../helper/AuthPageHelper.ts';
import { AuthFormInputs } from '../types/AuthFormInputs.ts';
import { SignupForm } from './SignUpForm.tsx';
import { AnimatePresence, motion } from 'framer-motion';
import { containerVariants } from '@/shared/styles/variants';
import { View } from '@/types/View.ts';
import LoadingOverlay from '@/components/LoadingOverlay.tsx';
// import LoginForm from '@/components/LoginForm.tsx';
import { getStoredUser } from '@/features/lib/auth.ts';
import { AuthFormData } from '@/types/AuthFormData.ts';

interface Props {
  authMode: "login" | "signup";
  setCurrentView: Dispatch<SetStateAction<View>>;
  onAuthSuccess: () => void;
  setLoggedInUser: React.Dispatch<React.SetStateAction<AuthFormData>>;
  setFormData: Dispatch<SetStateAction<Partial<LoginFormInputs>>>;
  setToastMsg: (msg: string, options: { type: 'success' | 'error' }) => void;
}

export function AuthPage({authMode = "login", setCurrentView, onAuthSuccess, setLoggedInUser, setFormData, setToastMsg}: Props) {
  const [loggedIn, setLoggedIn] = useState(!!getStoredUser());
  const {
    control: controlLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorslogin, isSubmitting },
    setValue: setValueLogin,
  } = useForm<AuthFormInputs>({
    shouldUnregister: false,
    defaultValues: {
      account_type: 'individual',  
      fullName: "",
      login: "",
      companyName: '',     
      companyEmail: '',
      jobPosition: "",
      customJobPosition: "",
      phone: "",
      country: '',
      dob: '',
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
      position: "",  
    }
  });

  const { control: controlSignup, handleSubmit: handleSubmitSignUp, formState: { errors: errorssignup, isSubmitting: isSubmittingSignup }, setValue: setValueSignup } = useForm<AuthFormInputs>({
    shouldUnregister: false,
    defaultValues: {
      account_type: 'individual',  
      fullName: "",
      login: "",
      companyName: '',     
      companyEmail: '',
      jobPosition: "",
      customJobPosition: "",
      phone: "",
      country: '',
      dob: '',
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
      position: "",  
    }
});

  const navigateTo = (view: View) => {
    const nextPath = view === 'login' ? '/login' : `/${view}`;

    window.history.pushState({}, '', nextPath);
    setCurrentView(nextPath as View);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setExternalUserId = (id: string) => {
    localStorage.setItem('external_user_id', id);
  }

return(
  <>
  <Portal>
    <LoadingOverlay isLoading={isSubmittingSignup} message={"Registering..."} />
  </Portal>
   <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[calc(100vh-84px)] flex items-center justify-center p-0 sm:p-6 lg:p-8 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-slate-50 -z-10" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/50 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-100/50 blur-[100px] rounded-full pointer-events-none" />

      {/* Container - layout removed to prevent height animation */}
      <Box 
        className="max-w-5xl w-full bg-white rounded-none sm:rounded-[2.5rem] shadow-none sm:shadow-[0_40px_160px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row min-h-[calc(100vh-84px)] sm:min-h-[500px] border-0 sm:border border-white relative z-10"
      >
        <AnimatePresence mode="wait" initial={false}>
          {authMode === "login" ? (
            <LoginForm
              setValue={setValueLogin}
              onAuthSuccess={onAuthSuccess}
              setLoggedInUser={setLoggedInUser}
              control={controlLogin}
              onChange={(e) => handleInputChangeLogin(e, setValueLogin)}
              handleSubmit={handleSubmitLogin}
              error={errorslogin}
              onNavigate={navigateTo}
              setToastMsg={setToastMsg}
              setExternalUserId={setExternalUserId}
              setFormData={setFormData}
            />
          ) : (
            <SignupForm
              control={controlSignup}
              error={errorssignup}
              handleSubmit={handleSubmitSignUp}
              onChange={(e) => handleInputChangeSignup(e, setValueSignup)}
              onNavigate={navigateTo}
              setToastMsg={setToastMsg}
            />
          )}
          </AnimatePresence>

  <Showcase isLoginMode={authMode} />
  </Box>
  </motion.div>
  </>
  )
}
