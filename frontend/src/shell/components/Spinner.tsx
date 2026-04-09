interface Props {
  size?: string;
}

export default function Spinner({ size = 'h-8 w-8' }: Props) {
  return (
    <div className="flex justify-center items-center p-4">
      <div
        className={`${size} border-4 border-t-primary-blue border-gray-200 rounded-full animate-spin`}
        role="status"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
}
