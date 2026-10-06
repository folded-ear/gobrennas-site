type PageProps = {
  params: Promise<{ label: string; planIds: string; bucketIds: string }>;
};

export default async function CookBucketPage({ params }: PageProps) {
  return <pre className="p-xl">{JSON.stringify(await params, null, 2)}</pre>;
}
