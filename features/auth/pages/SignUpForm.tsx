import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { View } from '@/types/View';
import { DENTAL_POSITIONS } from '@/constants/dentalPositions';
import { Control, Controller, FieldErrors, SubmitHandler, UseFormHandleSubmit } from 'react-hook-form';
import { AuthFormInputs } from '../types/AuthFormInputs';
import { Box } from "@mui/material";
import { inputClasses, labelClasses } from '@/shared/styles/style';
import { formVariants, shakeVariants } from '@/shared/styles/variants';
import { SubmitButton } from '@/shared/ui/SubmitButton';
import { useAuthMutation } from '../hooks/useAuthMutation';
import { MINI_APPS } from '@/constants';
import { AppIcon } from '@/shared/components/AppIcon';
import { DOBPicker } from '@/components/DOBPicker';

interface Props {
  control: Control<AuthFormInputs, any, AuthFormInputs>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  error: FieldErrors<AuthFormInputs>;
  handleSubmit: UseFormHandleSubmit<AuthFormInputs, AuthFormInputs>;
  onNavigate?: (view: View) => void;
  setToastMsg?: (msg: string, options: { type: 'success' | 'error' }) => void;
}

export const SignupForm: React.FC<Props> = ({ control, onChange, error, onNavigate, handleSubmit, setToastMsg }) => {
  const [isLoginMode] = useState('login');
  const [showTermsError, setShowTermsError] = useState(false);
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');

  const signupMutation = useAuthMutation();

  const onSubmit: SubmitHandler<AuthFormInputs> = async (data) => {
    try {
      const submittedAccountType:
      'individual' | 'company' =
      data.account_type === 'company'
        ? 'company'
        : 'individual';

      const isCompany =
        submittedAccountType === 'company';
      const effectivePosition = data.jobPosition === 'OTHER'
        ? data.customJobPosition || ''
        : data.jobPosition;

      const payload: AuthFormInputs = {
        ...data,
        account_type: submittedAccountType,
        login: isCompany
          ? data.companyEmail || data.login
          : data.login,
        companyName: data.companyName,
        companyEmail: data.companyEmail,
        fullName: data.fullName,
        phone: data.phone,
        country: data.country,
        dob: data.dob,
        position: effectivePosition,
        inviteCode:
          data.inviteCode?.trim() || undefined,
        tags:
          data.tags?.trim() || undefined,
      };

      console.log('payload being sent:', payload);

      const res = await signupMutation.mutateAsync(payload);

      if (res.result.created) {
        sessionStorage.removeItem(
          'snabbb_pending_signup_invite'
        );

        setToastMsg?.(
          'Registration successful! Email for verification sent.',
          { type: 'success' }
        );

        setTimeout(
          () => onNavigate && onNavigate('login'),
          2000
        );
      } else {
        setToastMsg?.('User already exists, please log in.', { type: 'error' });
      }
    } catch (err: any) {
      console.error('Signup failed:', err.message);
    }
  };

  const handleLegalClick = (e: React.MouseEvent, view: View) => {
    e.stopPropagation();
    e.preventDefault();
    if (onNavigate) onNavigate(view);
  };

  return (
    <>
      <div className="flex-[1.2] px-6 py-2 sm:p-8 md:p-10 flex flex-col justify-center relative bg-gradient-to-br from-white to-slate-50/30">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={'signup'}
            variants={formVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full"
          >
            <header className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2 tracking-tighter">
                Create Account
              </h1>
              <p className="text-slate-500 font-semibold text-sm sm:text-base max-w-sm leading-relaxed">
                Join our ecosystem of powerful mini-apps.
              </p>
            </header>

            <Box className="space-y-5">

              {/* Account Type */}
              <div>
                <label className={labelClasses}>Account Type</label>
                <Controller
                  name="account_type"
                  control={control}
                  defaultValue="individual"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 rounded-xl border border-slate-200 overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => { setAccountType('individual'); field.onChange('individual'); }}
                        className={`py-3 text-sm font-bold transition-all ${accountType === 'individual' ? 'bg-tiffany-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        <i className="fa-solid fa-user mr-2" /> Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAccountType('company'); field.onChange('company'); }}
                        className={`py-3 text-sm font-bold transition-all ${accountType === 'company' ? 'bg-tiffany-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        <i className="fa-solid fa-building mr-2" /> Company
                      </button>
                    </div>
                  )}
                />
              </div>

              {/* Company Fields */}
              {accountType === 'company' && (
                <>
                  <div>
                    <label className={labelClasses}>Company Name</label>
                    <div className="relative group">
                      <i className="fa-solid fa-building absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Controller
                        name="companyName"
                        defaultValue=""
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="e.g. INTERCOM MALI"
                            className={inputClasses}
                            required
                            onChange={(e) => { field.onChange(e); onChange(e); }}
                          />
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClasses}>Company Email</label>
                    <div className="relative group">
                      <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Controller
                        name="companyEmail"
                        defaultValue=""
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="email"
                            placeholder="e.g. hello@company.com"
                            className={inputClasses}
                            required
                            onChange={(e) => { field.onChange(e); onChange(e); }}
                          />
                        )}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400 italic">Company email for login and communication.</p>
                  </div>
                </>
              )}

              {/* Individual Email */}
              {accountType === 'individual' && (
                <div>
                  <label className={labelClasses}>Your Email</label>
                  <div className="relative group">
                    <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <Controller
                      name="login"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="email"
                          placeholder="e.g. nur@email.com"
                          className={inputClasses}
                          required
                          onChange={(e) => { field.onChange(e); onChange(e); }}
                        />
                      )}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400 italic">This will be your login email.</p>
                </div>
              )}

              {/* Referred By (Snabbb referral program) */}
              <div>
                <label className={labelClasses}>Referred by <span className="normal-case text-slate-400 font-medium">(optional)</span></label>
                <div className="relative group">
                  <i className="fa-solid fa-share-nodes absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="referralCode"
                    defaultValue=""
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Referral code"
                        className={inputClasses}
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400 italic">Referred by a doctor already on Snabbb? Enter their code, email, or share their link to auto-fill this.</p>
              </div>

              {/* Full Name */}
              <div>
                <label className={labelClasses}>Your Name</label>
                <div className="relative group">
                  <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="fullName"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder={accountType === 'company' ? 'e.g. Ahmad Nizam' : 'e.g. Nur AYA CHE'}
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {accountType === 'company' && (
                  <p className="mt-1 text-xs text-slate-400 italic">Your name as the company representative.</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className={labelClasses}>{accountType === 'individual' ? 'Phone (WhatsApp)' : 'Phone'}</label>
                <div className="relative group">
                  <i className="fa-solid fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="tel"
                        placeholder={accountType === 'individual' ? 'e.g. +60123456789' : 'phone'}
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {error.phone && <p className="mt-1 text-xs text-red-500">{error.phone.message}</p>}
              </div>

              {/* Date of Birth — both individual and company */}
              <div>
                <div>
                  <label className={labelClasses}>Date of Birth</label>
                  <DOBPicker
                    control={control}
                    name="dob"
                    labelClasses={labelClasses}
                    inputClasses={inputClasses}
                    onChange={onChange}
                    required
                  />
                </div>
                {accountType === 'company' && (
                  <p className="mt-1 text-xs text-slate-400 italic">Date of birth of the company representative.</p>
                )}
                {error.dob && <p className="mt-1 text-xs text-red-500">{error.dob.message}</p>}
              </div>

              {/* Job Position */}
              <div>
                <label className={labelClasses}>Job Position</label>
                <div className="relative group">
                  <i className="fa-solid fa-briefcase absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm z-10 pointer-events-none" />
                  <Controller
                    name="jobPosition"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={inputClasses}
                        value={field.value || ''}
                        required
                        onChange={(e) => {
                          const value = e.target.value;
                          setIsOtherMode(value === 'OTHER');
                          field.onChange(value);
                          onChange(e);
                        }}
                      >
                        <option value="" disabled>-- Select Position --</option>
                        {DENTAL_POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                        <option value="OTHER">Other</option>
                      </select>
                    )}
                  />
                  <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* Custom Job Position */}
              <AnimatePresence>
                {isOtherMode && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <label className={labelClasses}>Specify Position</label>
                    <div className="relative group">
                      <i className="fa-solid fa-pen-nib absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <Controller
                        name="customJobPosition"
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="text"
                            placeholder="e.g. Clinic Manager"
                            className={inputClasses}
                            required
                            onChange={(e) => { field.onChange(e); onChange(e); }}
                          />
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Country */}
              <div>
                <label className={labelClasses}>Country</label>
                <div className="relative group">
                  <i className="fa-solid fa-globe absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm z-10 pointer-events-none" />
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className={inputClasses}
                        value={field.value || ''}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      >
                        <option value="" disabled>-- Select Country --</option>
                        <option value="Afghanistan">Afghanistan</option>
                        <option value="Albania">Albania</option>
                        <option value="Algeria">Algeria</option>
                        <option value="American Samoa">American Samoa</option>
                        <option value="Andorra">Andorra</option>
                        <option value="Angola">Angola</option>
                        <option value="Anguilla">Anguilla</option>
                        <option value="Antarctica">Antarctica</option>
                        <option value="Antigua and Barbuda">Antigua and Barbuda</option>
                        <option value="Argentina">Argentina</option>
                        <option value="Armenia">Armenia</option>
                        <option value="Aruba">Aruba</option>
                        <option value="Australia">Australia</option>
                        <option value="Austria">Austria</option>
                        <option value="Azerbaijan">Azerbaijan</option>
                        <option value="Bahamas">Bahamas</option>
                        <option value="Bahrain">Bahrain</option>
                        <option value="Bangladesh">Bangladesh</option>
                        <option value="Barbados">Barbados</option>
                        <option value="Belarus">Belarus</option>
                        <option value="Belgium">Belgium</option>
                        <option value="Belize">Belize</option>
                        <option value="Benin">Benin</option>
                        <option value="Bermuda">Bermuda</option>
                        <option value="Bhutan">Bhutan</option>
                        <option value="Bolivia">Bolivia</option>
                        <option value="Bonaire, Sint Eustatius and Saba">Bonaire, Sint Eustatius and Saba</option>
                        <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option>
                        <option value="Botswana">Botswana</option>
                        <option value="Bouvet Island">Bouvet Island</option>
                        <option value="Brazil">Brazil</option>
                        <option value="British Indian Ocean Territory">British Indian Ocean Territory</option>
                        <option value="Brunei Darussalam">Brunei Darussalam</option>
                        <option value="Bulgaria">Bulgaria</option>
                        <option value="Burkina Faso">Burkina Faso</option>
                        <option value="Burundi">Burundi</option>
                        <option value="Cambodia">Cambodia</option>
                        <option value="Cameroon">Cameroon</option>
                        <option value="Canada">Canada</option>
                        <option value="Cape Verde">Cape Verde</option>
                        <option value="Cayman Islands">Cayman Islands</option>
                        <option value="Central African Republic">Central African Republic</option>
                        <option value="Chad">Chad</option>
                        <option value="Chile">Chile</option>
                        <option value="China">China</option>
                        <option value="Christmas Island">Christmas Island</option>
                        <option value="Cocos (Keeling) Islands">Cocos (Keeling) Islands</option>
                        <option value="Colombia">Colombia</option>
                        <option value="Comoros">Comoros</option>
                        <option value="Congo">Congo</option>
                        <option value="Cook Islands">Cook Islands</option>
                        <option value="Costa Rica">Costa Rica</option>
                        <option value="Croatia">Croatia</option>
                        <option value="Cuba">Cuba</option>
                        <option value="Curaçao">Curaçao</option>
                        <option value="Cyprus">Cyprus</option>
                        <option value="Czech Republic">Czech Republic</option>
                        <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                        <option value="Democratic Republic of the Congo">Democratic Republic of the Congo</option>
                        <option value="Denmark">Denmark</option>
                        <option value="Djibouti">Djibouti</option>
                        <option value="Dominica">Dominica</option>
                        <option value="Dominican Republic">Dominican Republic</option>
                        <option value="Ecuador">Ecuador</option>
                        <option value="Egypt">Egypt</option>
                        <option value="El Salvador">El Salvador</option>
                        <option value="Equatorial Guinea">Equatorial Guinea</option>
                        <option value="Eritrea">Eritrea</option>
                        <option value="Estonia">Estonia</option>
                        <option value="Eswatini">Eswatini</option>
                        <option value="Ethiopia">Ethiopia</option>
                        <option value="Falkland Islands">Falkland Islands</option>
                        <option value="Faroe Islands">Faroe Islands</option>
                        <option value="Fiji">Fiji</option>
                        <option value="Finland">Finland</option>
                        <option value="France">France</option>
                        <option value="French Guiana">French Guiana</option>
                        <option value="French Polynesia">French Polynesia</option>
                        <option value="French Southern Territories">French Southern Territories</option>
                        <option value="Gabon">Gabon</option>
                        <option value="Gambia">Gambia</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Germany">Germany</option>
                        <option value="Ghana">Ghana</option>
                        <option value="Gibraltar">Gibraltar</option>
                        <option value="Greece">Greece</option>
                        <option value="Greenland">Greenland</option>
                        <option value="Grenada">Grenada</option>
                        <option value="Guadeloupe">Guadeloupe</option>
                        <option value="Guam">Guam</option>
                        <option value="Guatemala">Guatemala</option>
                        <option value="Guernsey">Guernsey</option>
                        <option value="Guinea">Guinea</option>
                        <option value="Guinea-Bissau">Guinea-Bissau</option>
                        <option value="Guyana">Guyana</option>
                        <option value="Haiti">Haiti</option>
                        <option value="Heard Island and McDonald Islands">Heard Island and McDonald Islands</option>
                        <option value="Holy See (Vatican City State)">Holy See (Vatican City State)</option>
                        <option value="Honduras">Honduras</option>
                        <option value="Hong Kong">Hong Kong</option>
                        <option value="Hungary">Hungary</option>
                        <option value="Iceland">Iceland</option>
                        <option value="India">India</option>
                        <option value="Indonesia">Indonesia</option>
                        <option value="Iran">Iran</option>
                        <option value="Iraq">Iraq</option>
                        <option value="Ireland">Ireland</option>
                        <option value="Isle of Man">Isle of Man</option>
                        <option value="Israel">Israel</option>
                        <option value="Italy">Italy</option>
                        <option value="Jamaica">Jamaica</option>
                        <option value="Japan">Japan</option>
                        <option value="Jersey">Jersey</option>
                        <option value="Jordan">Jordan</option>
                        <option value="Kazakhstan">Kazakhstan</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Kiribati">Kiribati</option>
                        <option value="Kosovo">Kosovo</option>
                        <option value="Kuwait">Kuwait</option>
                        <option value="Kyrgyzstan">Kyrgyzstan</option>
                        <option value="Laos">Laos</option>
                        <option value="Latvia">Latvia</option>
                        <option value="Lebanon">Lebanon</option>
                        <option value="Lesotho">Lesotho</option>
                        <option value="Liberia">Liberia</option>
                        <option value="Libya">Libya</option>
                        <option value="Liechtenstein">Liechtenstein</option>
                        <option value="Lithuania">Lithuania</option>
                        <option value="Luxembourg">Luxembourg</option>
                        <option value="Macau">Macau</option>
                        <option value="Madagascar">Madagascar</option>
                        <option value="Malawi">Malawi</option>
                        <option value="Malaysia">Malaysia</option>
                        <option value="Maldives">Maldives</option>
                        <option value="Mali">Mali</option>
                        <option value="Malta">Malta</option>
                        <option value="Marshall Islands">Marshall Islands</option>
                        <option value="Martinique">Martinique</option>
                        <option value="Mauritania">Mauritania</option>
                        <option value="Mauritius">Mauritius</option>
                        <option value="Mayotte">Mayotte</option>
                        <option value="Mexico">Mexico</option>
                        <option value="Micronesia">Micronesia</option>
                        <option value="Moldova">Moldova</option>
                        <option value="Monaco">Monaco</option>
                        <option value="Mongolia">Mongolia</option>
                        <option value="Montenegro">Montenegro</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Morocco">Morocco</option>
                        <option value="Mozambique">Mozambique</option>
                        <option value="Myanmar">Myanmar</option>
                        <option value="Namibia">Namibia</option>
                        <option value="Nauru">Nauru</option>
                        <option value="Nepal">Nepal</option>
                        <option value="Netherlands">Netherlands</option>
                        <option value="New Caledonia">New Caledonia</option>
                        <option value="New Zealand">New Zealand</option>
                        <option value="Nicaragua">Nicaragua</option>
                        <option value="Niger">Niger</option>
                        <option value="Nigeria">Nigeria</option>
                        <option value="Niue">Niue</option>
                        <option value="Norfolk Island">Norfolk Island</option>
                        <option value="North Korea">North Korea</option>
                        <option value="North Macedonia">North Macedonia</option>
                        <option value="Northern Mariana Islands">Northern Mariana Islands</option>
                        <option value="Norway">Norway</option>
                        <option value="Oman">Oman</option>
                        <option value="Pakistan">Pakistan</option>
                        <option value="Palau">Palau</option>
                        <option value="Panama">Panama</option>
                        <option value="Papua New Guinea">Papua New Guinea</option>
                        <option value="Paraguay">Paraguay</option>
                        <option value="Peru">Peru</option>
                        <option value="Philippines">Philippines</option>
                        <option value="Pitcairn Islands">Pitcairn Islands</option>
                        <option value="Poland">Poland</option>
                        <option value="Portugal">Portugal</option>
                        <option value="Puerto Rico">Puerto Rico</option>
                        <option value="Qatar">Qatar</option>
                        <option value="Romania">Romania</option>
                        <option value="Russian Federation">Russian Federation</option>
                        <option value="Rwanda">Rwanda</option>
                        <option value="Réunion">Réunion</option>
                        <option value="Saint Barthélémy">Saint Barthélémy</option>
                        <option value="Saint Helena, Ascension and Tristan da Cunha">Saint Helena, Ascension and Tristan da Cunha</option>
                        <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option>
                        <option value="Saint Lucia">Saint Lucia</option>
                        <option value="Saint Martin (French part)">Saint Martin (French part)</option>
                        <option value="Saint Pierre and Miquelon">Saint Pierre and Miquelon</option>
                        <option value="Saint Vincent and the Grenadines">Saint Vincent and the Grenadines</option>
                        <option value="Samoa">Samoa</option>
                        <option value="San Marino">San Marino</option>
                        <option value="Saudi Arabia">Saudi Arabia</option>
                        <option value="Senegal">Senegal</option>
                        <option value="Serbia">Serbia</option>
                        <option value="Seychelles">Seychelles</option>
                        <option value="Sierra Leone">Sierra Leone</option>
                        <option value="Singapore">Singapore</option>
                        <option value="Sint Maarten (Dutch part)">Sint Maarten (Dutch part)</option>
                        <option value="Slovakia">Slovakia</option>
                        <option value="Slovenia">Slovenia</option>
                        <option value="Solomon Islands">Solomon Islands</option>
                        <option value="Somalia">Somalia</option>
                        <option value="South Africa">South Africa</option>
                        <option value="South Georgia and the South Sandwich Islands">South Georgia and the South Sandwich Islands</option>
                        <option value="South Korea">South Korea</option>
                        <option value="South Sudan">South Sudan</option>
                        <option value="Spain">Spain</option>
                        <option value="Sri Lanka">Sri Lanka</option>
                        <option value="State of Palestine">State of Palestine</option>
                        <option value="Sudan">Sudan</option>
                        <option value="Suriname">Suriname</option>
                        <option value="Svalbard and Jan Mayen">Svalbard and Jan Mayen</option>
                        <option value="Sweden">Sweden</option>
                        <option value="Switzerland">Switzerland</option>
                        <option value="Syria">Syria</option>
                        <option value="São Tomé and Príncipe">São Tomé and Príncipe</option>
                        <option value="Taiwan">Taiwan</option>
                        <option value="Tajikistan">Tajikistan</option>
                        <option value="Tanzania">Tanzania</option>
                        <option value="Thailand">Thailand</option>
                        <option value="Timor-Leste">Timor-Leste</option>
                        <option value="Togo">Togo</option>
                        <option value="Tokelau">Tokelau</option>
                        <option value="Tonga">Tonga</option>
                        <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                        <option value="Tunisia">Tunisia</option>
                        <option value="Turkmenistan">Turkmenistan</option>
                        <option value="Turks and Caicos Islands">Turks and Caicos Islands</option>
                        <option value="Tuvalu">Tuvalu</option>
                        <option value="Türkiye">Türkiye</option>
                        <option value="USA Minor Outlying Islands">USA Minor Outlying Islands</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Ukraine">Ukraine</option>
                        <option value="United Arab Emirates">United Arab Emirates</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="United States">United States</option>
                        <option value="Uruguay">Uruguay</option>
                        <option value="Uzbekistan">Uzbekistan</option>
                        <option value="Vanuatu">Vanuatu</option>
                        <option value="Venezuela">Venezuela</option>
                        <option value="Vietnam">Vietnam</option>
                        <option value="Virgin Islands (British)">Virgin Islands (British)</option>
                        <option value="Virgin Islands (USA)">Virgin Islands (USA)</option>
                        <option value="Wallis and Futuna">Wallis and Futuna</option>
                        <option value="Western Sahara">Western Sahara</option>
                        <option value="Yemen">Yemen</option>
                        <option value="Zambia">Zambia</option>
                        <option value="Zimbabwe">Zimbabwe</option>
                        <option value="Åland Islands">Åland Islands</option>
                      </select>
                    )}
                  />
                  <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] pointer-events-none" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className={labelClasses}>Password</label>
                <div className="relative group">
                  <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {error.password && <p className="mt-1 text-xs text-red-500">{error.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className={labelClasses}>Confirm Password</label>
                <div className="relative group">
                  <i className="fa-solid fa-shield-halved absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className={inputClasses}
                        required
                        onChange={(e) => { field.onChange(e); onChange(e); }}
                      />
                    )}
                  />
                </div>
                {error.confirmPassword && <p className="mt-1 text-xs text-red-500">{error.confirmPassword.message}</p>}
              </div>

              {/* Terms */}
              <motion.div
                animate={showTermsError ? 'shake' : ''}
                variants={shakeVariants}
                className={`flex items-start gap-3 pb-2 rounded-2xl transition-all duration-300 ${showTermsError ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-transparent'}`}
              >
                <Controller
                  name="agreedToTerms"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <>
                      <input
                        id="agreedToTerms"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(e) => { field.onChange(e.target.checked); onChange(e); }}
                        className={`mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer transition-all ${showTermsError ? 'ring-2 ring-rose-500 border-rose-500' : 'accent-blue-600'}`}
                      />
                      <div className="text-xs">
                        <label
                          htmlFor="agreedToTerms"
                          className={`font-medium cursor-pointer leading-relaxed transition-colors ${error.agreedToTerms ? 'text-rose-600' : 'text-slate-500'}`}
                        >
                          I agree to the{' '}
                          <span onClick={(e) => handleLegalClick(e, 'terms')} className="text-tiffany-600 font-bold hover:underline">Terms of Service</span>,{' '}
                          <span onClick={(e) => handleLegalClick(e, 'privacy')} className="text-tiffany-600 font-bold hover:underline">Privacy Policy</span>{' '}
                          and{' '}
                          <span onClick={(e) => handleLegalClick(e, 'disclaimer')} className="text-tiffany-600 font-bold hover:underline">Disclaimer</span>.
                        </label>
                        {error.agreedToTerms && (
                          <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] font-black uppercase text-rose-500 mt-1">
                            Required field
                          </motion.p>
                        )}
                      </div>
                    </>
                  )}
                />
              </motion.div>

              <SubmitButton isLoginMode={false} onClick={handleSubmit(onSubmit)} />
            </Box>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Side Showcase */}
      <div className="hidden md:flex flex-1 bg-slate-950 p-8 sm:p-10 lg:p-14 flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/15 blur-[120px] rounded-full translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        <div className="relative z-10 mb-12">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-[1.1] tracking-tighter">
              One account.<br />
              <span className="text-blue-500">Infinite</span> possibilities.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs font-medium">
              Unlock specialized tools built to accelerate your workflow.
            </p>
          </motion.div>
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
          className="grid grid-cols-3 gap-y-10 gap-x-6"
        >
          {MINI_APPS.map((app, i) => {
            if (i <= 5) {
              return <AppIcon key={app.id} icon={app.icon} label={app.title} />;
            }
          })}
        </motion.div>
      </div>
    </>
  );
};
