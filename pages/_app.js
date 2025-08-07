import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { Provider } from '../context';
import Head from 'next/head';
import { ThemeProvider } from 'next-themes';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

function MyApp({ Component, pageProps }) {
    return (
        <ThemeProvider attribute="class">
            <AuthProvider>
                <Provider>
                    <Head>
                        <title>DataDock</title>
                    </Head>
                    <div className="main_container">
                        <Component {...pageProps} />
                        <ToastContainer />
                    </div>
                </Provider>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default MyApp;