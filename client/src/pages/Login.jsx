import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Container, Card, CardBody, Form, FormGroup, Label, Input, Button, Alert, InputGroup } from 'reactstrap';
import { login, guestLogin, clearAuthError } from '../features/auth/authSlice.js';
import { EyeIcon, EyeOffIcon } from '../components/icons/EyeIcons.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, token } = useSelector((s) => s.auth);

  useEffect(() => {
    if (token) navigate('/', { replace: true });
  }, [token, navigate]);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const submit = (e) => {
    e.preventDefault();
    dispatch(login({ email, password }));
  };

  return (
    <div className="auth-shell">
      <Container style={{ maxWidth: 420 }}>
        <Card className="shadow-sm">
          <CardBody className="p-4">
            <h4 className="mb-1 fw-bold">Station Profit Tracker</h4>
            <p className="text-muted small mb-4">Admin sign in</p>
            {error && <Alert color="danger">{error}</Alert>}
            <Form onSubmit={submit}>
              <FormGroup>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </FormGroup>
              <FormGroup>
                <Label>Password</Label>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    color="secondary"
                    outline
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </InputGroup>
              </FormGroup>
              <Button color="primary" block disabled={status === 'loading'}>
                {status === 'loading' ? 'Signing in…' : 'Sign in as Admin'}
              </Button>
            </Form>

            <div className="d-flex align-items-center gap-2 my-3">
              <hr className="flex-grow-1" />
              <span className="text-muted small">or</span>
              <hr className="flex-grow-1" />
            </div>

            <Button
              color="primary"
              outline
              block
              disabled={status === 'loading'}
              onClick={() => dispatch(guestLogin())}
            >
              Continue to the Website
            </Button>
            <p className="text-muted small text-center mt-2 mb-0">
              For station staff — Move on to the website.
            </p>
          </CardBody>
        </Card>
      </Container>
    </div>
  );
}