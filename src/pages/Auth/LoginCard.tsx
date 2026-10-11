/**
 * @file LoginCard.tsx
 * @description Login screen with credentials and session bootstrap.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '../../components/ui';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux/store';
import { loginUser } from '../../redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { ROUTES, BRAND } from '../../constants';
import { BrandLogo } from '../../components/brand';
import { extractErrorMessage } from '../../utils/extractErrorMessage';
import { AlertCircle, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z
    .string()
    .nonempty('Please enter a valid email address')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .nonempty('Please enter your password')
    .min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginCard() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const loading = useSelector((state: RootState) => state.auth.loading);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (typeof window.particlesJS !== 'function') return;

    window.particlesJS('particles-js', {
      particles: {
        number: { value: 55, density: { enable: true, value_area: 900 } },
        color: { value: ['#ffffff', '#fe6000'] },
        shape: { type: 'circle' },
        opacity: { value: 0.18, random: true },
        size: { value: 2.5, random: true },
        line_linked: {
          enable: true,
          distance: 140,
          color: '#fe6000',
          opacity: 0.12,
          width: 1,
        },
        move: { enable: true, speed: 1.2, direction: 'none', random: true },
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: { enable: true, mode: 'grab' },
          resize: true,
        },
        modes: {
          grab: { distance: 120, line_linked: { opacity: 0.2 } },
        },
      },
      retina_detect: true,
    });
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    try {
      await dispatch(loginUser({ email: data.email, password: data.password })).unwrap();
      setLoginError(null);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error: unknown) {
      const message =
        typeof error === 'string' ? error : extractErrorMessage(error);
      setLoginError(message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="login-page relative min-h-dvh w-full overflow-hidden">
      <div id="particles-js" className="login-particles" aria-hidden />
      <div className="login-glow login-glow-left" aria-hidden />
      <div className="login-glow login-glow-right" aria-hidden />

      <div className="login-shell relative z-20 mx-auto flex min-h-dvh w-full max-w-6xl flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-12 px-4 py-10 sm:px-6 lg:px-10">
        <section className="login-brand-panel flex flex-col items-center text-center lg:items-start lg:text-left lg:flex-1 lg:py-8">
          <BrandLogo variant="login" />

          <p className="login-tagline mt-5">
            A <span className="login-tagline-accent">{BRAND.companyName.toUpperCase()}</span> PRODUCT
          </p>

          <h1 className="login-headline mt-8 hidden lg:block">
            {BRAND.appTitle.replace(' System', '')}
            <span className="login-headline-accent"> System</span>
          </h1>

          <p className="login-subcopy mt-4 hidden max-w-md text-sm leading-relaxed lg:block">
            Secure access to leads, briefs, campaigns, and team workflows — built for performance-driven teams.
          </p>

          <div className="login-trust-row mt-8 hidden items-center gap-2 text-xs text-gray-400 lg:flex">
            <ShieldCheck className="h-4 w-4 text-[#fe6000]" />
            <span>Enterprise-grade authentication & role-based access</span>
          </div>
        </section>

        <section className="login-card-wrapper mx-auto w-full max-w-[420px] shrink-0 lg:mx-0">
          <div className="login-card-accent" aria-hidden />

          <div className="login-card-header">
            <h2 className="login-card-title">Welcome back</h2>
            <p className="login-card-subtitle">Sign in to continue to your dashboard</p>
          </div>

          {loginError && (
            <div className="login-error" role="alert">
              <AlertCircle className="login-error-icon" />
              <span>{loginError.replace(/^Login validation failed:\s*/, '')}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            autoComplete="on"
            className="login-form space-y-5"
          >
            <div>
              <Input
                className="input-item"
                type="email"
                placeholder="name@company.com"
                label="Email Address"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>

            <div>
              <Input
                className="input-item"
                type="password"
                placeholder="Enter your password"
                label="Password"
                {...register('password')}
                error={errors.password?.message}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="login-btn"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="login-footer-note">
            {BRAND.copyright()}
          </p>
        </section>
      </div>
    </div>
  );
}
