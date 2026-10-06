import { parseBucketCookIds } from "@/features/plan-item/cook-link";
import { CookBucket } from "@/screens/cook-bucket";

type PageProps = {
  params: Promise<{ label: string; planIds: string; bucketIds: string }>;
};

export default async function CookBucketPage({ params }: PageProps) {
  const { planIds, bucketIds } = await params;
  return (
    <CookBucket
      planIds={parseBucketCookIds(planIds)}
      bucketIds={parseBucketCookIds(bucketIds)}
    />
  );
}
