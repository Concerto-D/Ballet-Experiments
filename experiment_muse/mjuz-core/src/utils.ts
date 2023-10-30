import { Future, producerStream, sinkFuture, Stream } from '@funkia/hareactive';
import Timeout = NodeJS.Timeout;

export const sigint: () => Future<void> = () => {
	const f = sinkFuture<void>();
	process.on('SIGINT', () => {
		return f.resolve();
	});
	return f;
};

export const sigquit: () => Future<void> = () => {
	const f = sinkFuture<void>();
	process.on('SIGQUIT', () => {
		return f.resolve();
	});
	return f;
};

export const sigterm: () => Future<void> = () => {
	const f = sinkFuture<void>();
	process.on('SIGTERM', () => f.resolve());
	return f;
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const keepAlive = (): Timeout => setInterval(() => {}, 2147483647);

export const intervalStream = (intervalMs: number): Stream<void> =>
	producerStream((push) => {
		const intervalId = setInterval(() => push(undefined), intervalMs);
		return () => clearInterval(intervalId);
	});

export const showDictWithoutProvider = (dict: any) => {
	const dictToShowOffer: any = {};
	for (const k in dict) {
		if (k !== '__provider') {
			dictToShowOffer[k] = dict[k];
		}
	}
};
