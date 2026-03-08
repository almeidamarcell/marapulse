import type { FC } from "hono/jsx";
import { Layout } from "../views/layout";

type LoginProps = {
  error?: string;
  success?: string;
};

export const LoginPage: FC<LoginProps> = ({ error, success }) => {
  return (
    <Layout title="Sign in - Marapulse">
      <div class="login-page">
        <div class="login-card">
          <h1 class="login-title">Sign in to Marapulse</h1>
          <p class="login-subtitle">Enter your email to receive a magic link</p>

          {error && <div class="login-error">{error}</div>}
          {success && <div class="login-success">{success}</div>}

          <form method="post" action="/login" class="login-form">
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              required
              autofocus
              class="login-input"
            />
            <button type="submit" class="login-button">Send magic link</button>
          </form>
        </div>
      </div>
    </Layout>
  );
};
