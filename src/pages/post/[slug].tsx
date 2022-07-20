import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { format, minutesToHours } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

import styles from './post.module.scss';
import Container from '../../components/Container';

interface Post {
    first_publication_date: string | null;
    data: {
        title: string;
        banner: {
            url: string;
        };
        author: string;
        content: {
            heading: string;
            body: {
                text: string;
            }[];
        }[];
    };
}

interface PostProps {
    post: Post;
}

interface Content {
    heading: string;
    body: {
        text: string;
    }[];
}

export default function Post({ post }: PostProps): JSX.Element {
    const { isFallback } = useRouter();

    if (isFallback) {
        return <h1>Carregando...</h1>;
    }

    function formatDate(date: string): string {
        return format(new Date(date), 'dd MMM yyyy', { locale: ptBR });
    }

    function calculateReadingTime(content: Content[]): string {
        const getHeadingWordsPerMinutes = content.reduce(
            (acc, currentValue) => {
                return currentValue.heading.split(/\s+/).length + acc;
            },
            0
        );

        const getBodyWordsPerMinutes = content.reduce((acc, currentValue) => {
            return RichText.asText(currentValue.body).split(/\s+/).length + acc;
        }, 0);

        const getWordsPerMinutes = Math.ceil(
            (getHeadingWordsPerMinutes + getBodyWordsPerMinutes) / 200
        );

        if (getWordsPerMinutes < 1) {
            return 'Rápida leitura';
        }

        if (getWordsPerMinutes < 60) {
            return `${getWordsPerMinutes} min`;
        }

        return `${minutesToHours(getWordsPerMinutes)} horas`;
    }

    return (
        <>
            <Head>
                <title>{post.data.title} | Spacetraveling</title>
            </Head>

            <Container>
                <Header />
            </Container>

            {post.data.banner && (
                <img
                    className={styles.banner}
                    src={post.data.banner.url}
                    alt="banner"
                />
            )}

            <main className={styles.container}>
                <Container>
                    <article className={styles.post}>
                        <header>
                            <h1>{post.data.title}</h1>
                            <div className={styles.postInfo}>
                                <span>
                                    <FiCalendar color="#BBBBBB" size={20} />
                                    {formatDate(post.first_publication_date)}
                                </span>
                                <span>
                                    <FiUser color="#BBBBBB" size={20} />
                                    {post.data.author}
                                </span>
                                <span>
                                    <FiClock color="#BBBBBB" size={20} />
                                    {calculateReadingTime(post.data.content)}
                                </span>
                            </div>
                        </header>

                        <section className={styles.postContent}>
                            {post.data.content.map(content => (
                                <div key={content.heading}>
                                    <h1>{content.heading}</h1>
                                    <div
                                        // eslint-disable-next-line react/no-danger
                                        dangerouslySetInnerHTML={{
                                            __html: RichText.asHtml(
                                                content.body
                                            ),
                                        }}
                                    />
                                </div>
                            ))}
                        </section>
                    </article>
                </Container>
            </main>
        </>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const prismic = getPrismicClient({});
    const posts = await prismic.getByType('posts', {
        fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
        pageSize: 3,
    });

    const paths = posts.results.map(post => ({
        params: {
            slug: post.uid,
        },
    }));

    return {
        paths,
        fallback: true,
    };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const { slug } = params;

    const prismic = getPrismicClient({});
    const response = await prismic.getByUID('posts', String(slug), {});

    const contentPosts = response.data.content.map(post => {
    return {
      heading: post.heading,
      body: post.body,
    };
  });

  const post = {
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: contentPosts,
    },
    uid: response.uid,
  };

  // TODO
  return {
    props: { post },
    revalidate: 10, // 10 In seconds
  };
};