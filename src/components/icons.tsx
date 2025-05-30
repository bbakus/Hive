import type { LucideProps } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming you have a cn utility

export const Icons = {
  HiveLogo: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor" // Changed to currentColor to inherit text-accent
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
      className={cn("text-accent", props.className)} // Apply text-accent directly
    >
      <title>HIVE Logo</title>
      <path d="M12 2l-7.79 4.5 2.05 11L12 22l7.74-4.5 2.05-11L12 2z" />
      <path d="M4.21 6.5L12 2l7.79 4.5" />
      <path d="M12 22V12" />
      <path d="M21.84 17.5L12 12l-9.84 5.5" />
      <path d="M6.26 17.5L4.21 6.5l7.79 4.5" />
      <path d="M17.74 17.5L19.79 6.5l-7.79 4.5" />
    </svg>
  ),
};
