import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Eye, EyeOff, Bot, ArrowRight, ShieldCheck } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password strength meter
  const passwordStrength = React.useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const strengthColors = [
    'bg-[#DCD5C9]',
    'bg-[#6A2E2A]',
    'bg-[#8F5B1A]',
    'bg-[#1E3A5F]',
    'bg-[#255C3A]',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await signup(fullName, email, password);
      showToast('Account created and workspace initialized with benchmark emails!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-[2px] bg-[#1E3A5F] flex items-center justify-center text-[#FCFAF7]">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-serif-title font-semibold text-xl text-[#1E1E1C]">
              AetherMail
            </span>
          </Link>
          <h2 className="text-2xl font-serif-title font-semibold text-[#1E1E1C]">Create your workspace account</h2>
          <p className="text-xs font-serif-body text-[#6B665F]">
            Set up your executive profile and persistent storage
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] space-y-5">
          {error && (
            <div className="p-3 rounded-[2px] bg-[#FCF2F1] border border-[#E8C5C2] text-xs font-mono text-[#6A2E2A]">
              {error}
            </div>
          )}

          {/* Google SSO Button */}
          <a
            href="/api/auth/google/login"
            className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-xs font-mono font-medium rounded-[2px] border border-[#DCD5C9] bg-[#FCFAF7] text-[#1E1E1C] hover:bg-[#F4F1EA] hover:border-[#BDB5A7] transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </a>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#DCD5C9]"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#FCFAF7] px-2 text-[#6B665F] font-mono text-[10px] uppercase tracking-wider">
                or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              icon={User}
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="alex@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono font-medium text-[#6B665F] tracking-wider uppercase">
                Password
              </label>
              <div className="relative rounded-[2px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B665F]">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full bg-[#FCFAF7] border border-[#DCD5C9] hover:border-[#BDB5A7] text-[#1E1E1C] placeholder-[#8C867C] text-sm rounded-[2px] pl-8 pr-10 py-2 transition focus:outline-none focus:border-[#1E3A5F]"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B665F] hover:text-[#1E1E1C]"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password strength bar */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`flex-1 rounded-[2px] transition-all ${
                          passwordStrength >= step
                            ? strengthColors[passwordStrength]
                            : 'bg-[#ECE7DE]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-[#6B665F] font-mono">
                    <span>Complexity</span>
                    <span>{strengthLabels[passwordStrength]}</span>
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              className="w-full mt-2"
              icon={ArrowRight}
            >
              Initialize Workspace
            </Button>
          </form>

          <div className="pt-4 border-t border-[#DCD5C9] text-center">
            <p className="text-xs font-serif-body text-[#6B665F]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#1E3A5F] hover:underline font-semibold font-mono text-xs">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
