import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/claw/download?platform=cli',
    permanent: false,
  },
});

export default function DownloadsRedirectPage(): null {
  return null;
}